/**
 * Line Sweep - Line Segment Intersection Algorithm
 * This class implements the line sweep algorithm to find intersections
 * between line segments. The event queue consists of segment endpoints,
 * and the algorithm processes these events to maintain an active set of
 * segments and detect intersections.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Sweep_line_algorithm
 *   - https://en.wikipedia.org/wiki/Intersection_(geometry)#Two_line_segments
 *   - https://www.youtube.com/watch?v=SVwItRH2DNU - Mod-03 Lec-05 Segment Intersection Problem by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - https://www.youtube.com/watch?v=_j1Qd9suN0s - Mod-03 Lec-04 Line Sweep Method by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - Section 7.1, "Plane Sweep Algorithms", in "Computational Geometry & Computer Graphics in C++" by Michael J. Laszlo
 *   - Chapter 2, "Line Segment Intersection", in "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 */

class LineSegmentIntersection {
  constructor() {
    this.segments = [];
    this.steps = [];
    this.currentStep = 0;
    this.intersections = [];
    this.sweepLine = 0;
    this.activeSegments = [];
    this.algorithmStep = 0;
  }

  addSegment(segment) {
    this.segments.push(segment);
    this.reset();
  }

  removeSegment(segment) {
    const index = this.segments.findIndex((s) => s === segment);
    if (index !== -1) {
      this.segments.splice(index, 1);
      this.reset();
    }
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.intersections = [];
    this.sweepLine = 0;
    this.activeSegments = [];
    this.algorithmStep = 0;
  }

  clear() {
    this.segments = [];
    this.reset();
  }

  computeSteps() {
    if (this.segments.length === 0) {
      this.steps = [
        {
          description: "No line segments to process",
          sweepLine: 0,
          activeSegments: [],
          intersections: [],
          highlightedSegments: [],
          eventSets: {
            events: [],
            segments: [],
          },
        },
      ];
      return;
    }

    this.steps = [];
    this.intersections = [];

    // Create events for segment endpoints
    const events = [];
    this.segments.forEach((seg, index) => {
      const leftX = Math.min(seg.p1.x, seg.p2.x);
      const rightX = Math.max(seg.p1.x, seg.p2.x);

      events.push({
        x: leftX,
        type: "start",
        segment: seg,
        segmentIndex: index,
        id: `start-${index}`,
      });

      events.push({
        x: rightX,
        type: "end",
        segment: seg,
        segmentIndex: index,
        id: `end-${index}`,
      });
    });

    // Sort events by x-coordinate
    events.sort((a, b) => a.x - b.x);

    this.steps.push({
      description: "Starting line sweep from left to right",
      sweepLine: events.length > 0 ? events[0].x - 50 : 0,
      activeSegments: [],
      intersections: [],
      highlightedSegments: [],
      algorithmStep: 2,
      eventSets: {
        events: events.map((e, i) => ({
          ...e,
          status: "pending",
          description: `${e.type === "start" ? "Start" : "End"} segment ${
            e.segmentIndex + 1
          } at x=${e.x.toFixed(1)}`,
        })),
        segments: this.segments.map((seg, i) => ({
          segment: seg,
          index: i,
          status: "pending",
        })),

        eventQueue: events.map((e) => ({
          label: `${e.type.toUpperCase()} seg ${
            e.segmentIndex + 1
          } @ x=${e.x.toFixed(1)}`,
          status: "pending",
          ...e,
        })),
        activeSet: [],
        output: [],
      },
    });

    const activeSegments = [];
    const processedEvents = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      this.sweepLine = event.x;
      processedEvents.push(event.id);

      if (event.type === "start") {
        // Add segment to active set
        activeSegments.push(event.segment);

        this.steps.push({
          description: `Sweep line at x=${event.x.toFixed(1)}: Added segment ${
            event.segmentIndex + 1
          } to active set`,
          sweepLine: event.x,
          activeSegments: [...activeSegments],
          intersections: [...this.intersections],
          highlightedSegments: [event.segmentIndex],
          algorithmStep: 3,
          eventSets: {
            events: events.map((e, j) => ({
              ...e,
              status: processedEvents.includes(e.id)
                ? "processed"
                : j === i
                ? "current"
                : "pending",
              description: `${e.type === "start" ? "Start" : "End"} segment ${
                e.segmentIndex + 1
              } at x=${e.x.toFixed(1)}`,
            })),
            segments: this.segments.map((seg, k) => ({
              segment: seg,
              index: k,
              status: activeSegments.includes(seg)
                ? "active"
                : k === event.segmentIndex
                ? "current"
                : "pending",
            })),

            eventQueue: events.map((e, j) => ({
              label: `${e.type.toUpperCase()} seg ${
                e.segmentIndex + 1
              } @ x=${e.x.toFixed(1)}`,
              status: processedEvents.includes(e.id)
                ? "processed"
                : j === i
                ? "current"
                : "pending",
              ...e,
            })),
            activeSet: activeSegments.map((seg) => ({
              label: `Segment ${this.segments.indexOf(seg) + 1}`,
              status: "active",
              segment: seg,
              segmentIndex: this.segments.indexOf(seg),
            })),
            output: this.intersections.map((intr, idx) => ({
              label: `Intersection ${idx + 1} (${intr.x.toFixed(
                1
              )}, ${intr.y.toFixed(1)})`,
              status: "kept",
              ...intr,
            })),
          },
        });

        // Check intersections with other active segments
        for (let j = 0; j < activeSegments.length - 1; j++) {
          const otherSeg = activeSegments[j];
          if (LineSegment.doIntersect(event.segment, otherSeg)) {
            const intersection = LineSegment.intersection(
              event.segment,
              otherSeg
            );
            if (intersection && intersection.x >= event.x) {
              this.intersections.push({
                ...intersection,
                segments: [event.segmentIndex, this.segments.indexOf(otherSeg)],
              });

              this.steps.push({
                description: `Found intersection at (${intersection.x.toFixed(
                  1
                )}, ${intersection.y.toFixed(1)}) between segments ${
                  event.segmentIndex + 1
                } and ${this.segments.indexOf(otherSeg) + 1}`,
                sweepLine: event.x,
                activeSegments: [...activeSegments],
                intersections: [...this.intersections],
                highlightedSegments: [
                  event.segmentIndex,
                  this.segments.indexOf(otherSeg),
                ],
                algorithmStep: 4,
                eventSets: {
                  events: events.map((e, j) => ({
                    ...e,
                    status: processedEvents.includes(e.id)
                      ? "processed"
                      : j === i
                      ? "current"
                      : "pending",
                    description: `${
                      e.type === "start" ? "Start" : "End"
                    } segment ${e.segmentIndex + 1} at x=${e.x.toFixed(1)}`,
                  })),
                  segments: this.segments.map((seg, k) => ({
                    segment: seg,
                    index: k,
                    status: [
                      event.segmentIndex,
                      this.segments.indexOf(otherSeg),
                    ].includes(k)
                      ? "intersecting"
                      : activeSegments.includes(seg)
                      ? "active"
                      : "pending",
                  })),

                  eventQueue: events.map((e, j) => ({
                    label: `${e.type.toUpperCase()} seg ${
                      e.segmentIndex + 1
                    } @ x=${e.x.toFixed(1)}`,
                    status: processedEvents.includes(e.id)
                      ? "processed"
                      : j === i
                      ? "current"
                      : "pending",
                    ...e,
                  })),
                  activeSet: activeSegments.map((seg) => ({
                    label: `Segment ${this.segments.indexOf(seg) + 1}`,
                    status: [
                      event.segmentIndex,
                      this.segments.indexOf(otherSeg),
                    ].includes(this.segments.indexOf(seg))
                      ? "current"
                      : "active",
                    segment: seg,
                    segmentIndex: this.segments.indexOf(seg),
                  })),
                  output: this.intersections.map((intr, idx, arr) => ({
                    label: `Intersection ${idx + 1} (${intr.x.toFixed(
                      1
                    )}, ${intr.y.toFixed(1)})`,
                    status: idx === arr.length - 1 ? "new" : "kept",
                    ...intr,
                  })),
                },
              });
            }
          }
        }
      } else {
        // Remove segment from active set
        const index = activeSegments.indexOf(event.segment);
        if (index > -1) {
          activeSegments.splice(index, 1);
        }

        this.steps.push({
          description: `Sweep line at x=${event.x.toFixed(
            1
          )}: Removed segment ${event.segmentIndex + 1} from active set`,
          sweepLine: event.x,
          activeSegments: [...activeSegments],
          intersections: [...this.intersections],
          highlightedSegments: [event.segmentIndex],
          algorithmStep: 5,
          eventSets: {
            events: events.map((e, j) => ({
              ...e,
              status: processedEvents.includes(e.id)
                ? "processed"
                : j === i
                ? "current"
                : "pending",
              description: `${e.type === "start" ? "Start" : "End"} segment ${
                e.segmentIndex + 1
              } at x=${e.x.toFixed(1)}`,
            })),
            segments: this.segments.map((seg, k) => ({
              segment: seg,
              index: k,
              status: activeSegments.includes(seg)
                ? "active"
                : k === event.segmentIndex
                ? "current"
                : "processed",
            })),

            eventQueue: events.map((e, j) => ({
              label: `${e.type.toUpperCase()} seg ${
                e.segmentIndex + 1
              } @ x=${e.x.toFixed(1)}`,
              status: processedEvents.includes(e.id)
                ? "processed"
                : j === i
                ? "current"
                : "pending",
              ...e,
            })),
            activeSet: activeSegments.map((seg) => ({
              label: `Segment ${this.segments.indexOf(seg) + 1}`,
              status: "active",
              segment: seg,
              segmentIndex: this.segments.indexOf(seg),
            })),
            output: this.intersections.map((intr, idx) => ({
              label: `Intersection ${idx + 1} (${intr.x.toFixed(
                1
              )}, ${intr.y.toFixed(1)})`,
              status: "kept",
              ...intr,
            })),
          },
        });
      }
    }

    this.steps.push({
      description: `Line sweep complete. Found ${this.intersections.length} intersections`,
      sweepLine: events.length > 0 ? events[events.length - 1].x + 50 : 0,
      activeSegments: [],
      intersections: [...this.intersections],
      highlightedSegments: [],
      algorithmStep: 6,
      eventSets: {
        events: events.map((e) => ({
          ...e,
          status: "processed",
          description: `${e.type === "start" ? "Start" : "End"} segment ${
            e.segmentIndex + 1
          } at x=${e.x.toFixed(1)}`,
        })),
        segments: this.segments.map((seg, k) => ({
          segment: seg,
          index: k,
          status: "processed",
        })),

        eventQueue: events.map((e) => ({
          label: `${e.type.toUpperCase()} seg ${
            e.segmentIndex + 1
          } @ x=${e.x.toFixed(1)}`,
          status: "processed",
          ...e,
        })),
        activeSet: [],
        output: this.intersections.map((intr, idx) => ({
          label: `Intersection ${idx + 1} (${intr.x.toFixed(
            1
          )}, ${intr.y.toFixed(1)})`,
          status: "completed",
          ...intr,
        })),
      },
    });
  }

  getCurrentStep() {
    if (this.steps.length === 0) this.computeSteps();
    if (this.steps.length === 0) return null;
    return this.steps[this.currentStep] || this.steps[0];
  }

  nextStep() {
    if (this.steps.length === 0) this.computeSteps();
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      return true;
    }
    return false;
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      return true;
    }
    return false;
  }

  canGoNext() {
    return this.currentStep < this.steps.length - 1;
  }

  canGoPrev() {
    return this.currentStep > 0;
  }
}
