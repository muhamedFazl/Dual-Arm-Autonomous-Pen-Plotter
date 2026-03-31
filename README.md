# Dual-Arm Autonomous Pen-Plotter

An end-to-end mechatronic system engineered to autonomously execute physical brush strokes using a synchronized dual-arm robotic setup. This project was developed with Team Envisage (IIT Madras Center for Innovation) and showcased at the IITM Research Conclave and Shaastra Tech Fest.

## ⚙️ System Architecture
The system operates on a custom data pipeline bridging computer vision and physical mechatronics:
1. **Perception:** Camera captures the subject.
2. **Processing:** An AI model processes the capture into an SVG caricature format.
3. **Translation:** Custom scripts convert the SVG data into optimized G-code.
4. **Execution:** The G-code is streamed to a custom-modified GRBL controller to drive the physical arms.

## 🔧 Hardware & Control Modifications
Standard off-the-shelf controllers were insufficient for the specific physical constraints of this project. Key engineering solutions included:
* **GRBL Modification:** Altered the open-source GRBL library to support custom servo motor functionality for precise brush mechanics.
* **Kinematics & Synchronization:** Programmed custom inverse kinematics to translate 2D coordinates into complex multi-joint movements.
* **Traffic Management:** Implemented collision-avoidance algorithms to synchronize the two robotic arms in real-time within a shared workspace.

## 📸 Media
![Plotter in Action](link-to-image.gif)
