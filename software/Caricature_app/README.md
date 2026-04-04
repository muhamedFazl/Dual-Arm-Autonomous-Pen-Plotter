# 🎨 Caricature to G-code

An AI-powered web application designed to transform standard photographs into artistic, line-based caricatures and convert them into machine-ready **G-code** for CNC plotters and drawing robots.

## 🚀 Key Features

*   **AI Transformation**: Leverages Google Generative AI (Gemini) to convert portraits into stylized caricatures.
*   **Advanced Image Processing**: 
    *   **Binarization**: Intelligent thresholding for high-contrast line extraction.
    *   **Zhang-Suen Thinning**: Implements a skeletonization algorithm to reduce lines to single-pixel thickness, ensuring precise machine paths.
*   **G-code & SVG Generation**: 
    *   Automatically generates GRBL-compatible G-code for plotting.
    *   Exports clean SVG paths for vector-based design work.
*   **Real-time Preview**: A multi-stage preview system showing the original, AI-output, and the final thinned skeleton.
*   **Persistent History**: A local save system (built on `localStorage`) that allows users to store, retrieve, and download past creations.
*   **Modern Workspace**: A premium, responsive dark-mode interface built for speed and visual clarity.

## 🛠️ Technology Stack

*   **Core**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
*   **AI Engine**: [Google Generative AI (Gemini)](https://ai.google.dev/)
*   **Image Tracing**: `imagetracerjs`
*   **Icons**: [Lucide React](https://lucide.dev/)

## Run locally
* ```npm run dev```
