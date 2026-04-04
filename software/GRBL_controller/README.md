# GRBLCONTROL: Modern Web-Based CNC Interface

GRBLCONTROL is a high-performance, aesthetically pleasing web interface designed for controlling GRBL-based CNC machines. It provides a robust alternative to traditional desktop-based G-code senders, leveraging modern web technologies to offer a seamless, responsive experience directly in the browser.

![GRBL Controller Interface](file:///C:/Users/hp/.gemini/antigravity/brain/19fd085d-7eda-412d-a6b6-b03b133e0bcd/grbl_verify_5174_1775210525748.png)

## 🚀 Key Features

### 🔌 Direct Hardware Connection
- **Web Serial API**: Connect directly to your machine via USB at 115200 baud.
- **Robust Lifecyle Management**: Automatic stream cleanup and error handling for reliable long-term operations.
- **Bi-directional Console**: Real-time logging of sent and received commands with a command history buffer.

### 🧊 3D G-Code Visualizer
- **Real-time Toolpath Rendering**: Powered by React Three Fiber for smooth, high-performance visualization.
- **Interactive Highlighting**: Synchronized bi-directional communication between the 3D visualizer and the G-code editor. Click a line in the editor to highlight the toolpath segment, and vice versa.
- **Toolhead Tracking**: A visual toolhead marker follows the toolpath in real-time as the program executes.
- **Preview Toggle**: Toggle visibility of unexecuted lines to focus on current progress.

### 📝 G-Code Editor & Playback
- **Advanced Playback Engine**: 
    - **Resume/Pause**: Full control over the execution state.
    - **Start from Selected**: Capability to begin streaming from any specific line in the G-code file.
- **Syncronized Scrolling**: The editor automatically scrolls and highlights the currently executing line.

### 🔄 Integrated Workflow (Caricature App)
- **History Bridge**: Seamlessly load G-code files generated from the companion Caricature app using a secure cross-origin iframe bridge.
- **Quick Load**: Access your design history and load them directly into the controller with a single click.

## 🛠️ Technology Stack
- **Framework**: React 19 + Vite 7
- **3D Engine**: @react-three/fiber + Three.js
- **Styling**: Tailwind CSS 4 + Lucide Icons
- **Hardware**: Web Serial API
- **Animations**: Framer Motion

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- A Web Serial compatible browser (Chrome, Edge, or Opera)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd GRBL_controller
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
4.  **Access the app**:
    Open [http://localhost:5174](http://localhost:5174) in your browser. (The port is configured to 5174 by default in `vite.config.js`).

## 📖 Usage Guide
1.  **Connect**: Ensure your GRBL machine is plugged in, then click the **Connect** button. Select the appropriate COM port.
2.  **Load G-Code**:
    - Use the **Load G-Code** button to upload a local file.
    - Click **History** to pull designs from the Caricature app bridge.
3.  **Stream**: Once loaded, use the **Play** button to begin execution. You can use **Pause** at any time or manually select a starting line in the editor and click the **FastForward** (Start from selected) icon.
4.  **Monitor**: Keep track of machine coordinates and progress in the left-hand status panel.

---
Built with ❤️ for the Envisage SwiftCanvas project.

