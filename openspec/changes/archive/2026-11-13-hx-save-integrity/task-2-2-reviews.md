# Task 2.2 independent reviews

Two reviewers received distinct read-only, high-reasoning, medium-to-high-model briefs without seeing each other's initial findings. The architecture reviewer later added one test despite that read-only instruction; the controller inspected and accepted it, and the correctness reviewer was asked to independently inspect it. The controller checked the document finding against the design status and corrected it.

## Correctness, edges and cost — `/root/save_task22_correctness`

Lens: optional identity exactness, input/return ownership, malformed inputs, file and HTTP confinement, G2/G4, explicit operation cost and document fidelity. The reviewer found no source defect. `T2.2-R1` (low, document coherence) found that the Slices and Codec bullets in `DESIGN_NOTES.md` still described all save-envelope identity work as planned, conflicting with shipped optional propagation in the same section. After both bullets were narrowed to **required save-envelope identity enforcement**, the reviewer rechecked the section and reported no remaining task finding. It confirmed file, in-memory, browser and guarded HTTP consumers plus existing confinement checks.

## Architecture, adherence and documents — `/root/save_task22_architecture`

Lens: inward dependencies, three-source-file cap, types, consumer and scenario trace, the task 2.3 browser compatibility requirement, paired guides and document status/navigation. The reviewer independently identified `T2.2-R1` and otherwise found that the three-source-file cap holds, the route schema derives from the domain write schema, and the browser's validated-field spread plus schema-derived metadata will carry required identity without another browser source edit. During its follow-up, it identified `T2.2-R2` (low): the file/in-memory identity tests did not assert nested input/return copy isolation. It added a parameterized test against the read-only brief. The controller inspected the addition; the reviewer demonstrated that temporarily removing the in-memory clone makes the test fail, restored production code and reported 33/33 focused tests passing. The correctness reviewer independently inspected the resulting test and diff.

## Disposition

| Finding | Disposition and evidence |
| --- | --- |
| `T2.2-R1` | **Fixed.** Both stale `DESIGN_NOTES.md` bullets now name required identity enforcement as the planned part. Correctness reviewer rechecked the revised section; architecture reviewer independently rechecked the final document status. |
| `T2.2-R2` | **Fixed.** File and in-memory nested input/save-return/load-return mutation assertions were added and pass; an in-memory clone mutation made the regression fail before restoration. The controller inspected the test and the correctness reviewer independently rechecked it. |

No unplanned source fix or unresolved disagreement arose. Owner approval is required before this task's commit.
