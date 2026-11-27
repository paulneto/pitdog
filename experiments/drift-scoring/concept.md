# Drift Scoring: concept and build plan

## What it does
It scores a drift run on **angle, speed, line and consistency**, and turns the run into a shareable video with a live overlay showing angle, speed and points. It's built for practice, coaching and fun competitions (a "drift-off" at a club event, or a season leaderboard), not as a replacement for official judging.

**Precedent:** Racelogic's DriftBox did sensor-based drift scoring years ago, so the idea is proven. Modern cheap sensors, phone video and AI make a much better version possible now.

## Two routes (do A first)

### A. Sensor-based: practical, buildable in a weekend
- **Hardware:** a 25 Hz GPS with an IMU (e.g. RaceBox Mini, about $200), or AiM data if it has a gyro, or a phone at a pinch (lower quality).
- **The core maths:** drift angle = **car heading** (from integrated gyro yaw rate) minus **direction of travel** (from the GPS velocity vector). Reset gyro drift on straights, where the two should match.
- **Score per run:**
  - Angle: mean and peak angle, time above a threshold (e.g. >25°)
  - Speed while sliding
  - Line: distance to "clipping points" you set on a map (GPS geofences), the same way real judges set clips
  - Commitment and smoothness: angle held through transitions without straightening, and few corrections (counter-steer spikes in yaw rate)
  - Consistency: variance across your runs on the same course
- **Output:** a scorecard, run-vs-run comparison, a map trace coloured by angle, and a CSV.

### B. Video-based: the cool part, and the content engine
- A fixed camera at the corner, or a drone. A detection/segmentation model tracks the car's outline and orientation against its path, which gives angle from video alone.
- Harder, and accuracy depends on camera placement. Best as **v2**, or as an **overlay on route A** (sync sensor data to GoPro footage) for Instagram and YouTube clips.

## Build plan
1. **v0 (one evening):** feed one sensor CSV from a drift session → angle-over-time chart + basic score. This proves the maths on your own data.
2. **v1:** clipping-point editor on a map + scorecard + run comparison (single-file web app, like the stint planner).
3. **v2:** video overlay export (angle gauge, speed, score) synced to GoPro footage.
4. **v3:** event mode: multiple drivers, leaderboard, QR code to upload runs.

## What I need from you
- One or two **drift session data files** (RaceBox, AiM, VBOX, RaceChrono or phone app export) and, if you have one, the **matching onboard or outside video**.
- What you drift in, and where (which events or venues). That sets the realistic angle and speed ranges for the scoring.
