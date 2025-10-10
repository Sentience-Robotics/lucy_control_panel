# Lucy Control Panel
<!-- Advanced web-based control interface for InMoov humanoid robots with real-time 3D visualization -->

A modern, TUI-themed web interface for controlling robots with real-time joint manipulation and immersive 3D visualization.

---

## 📌 Overview

Lucy Control Panel is a comprehensive web-based control system designed specifically for robots. Built with React and Three.js, it provides an intuitive terminal-style interface that allows users to control individual robot joints, save/load poses, and visualize the robot in real-time 3D.

The application features a distinctive green-on-black cyberpunk aesthetic reminiscent of classic terminal interfaces, making robot control both functional and visually engaging. Whether you're programming complex movements or fine-tuning individual joints, Lucy Control Panel provides the tools needed for precise robot manipulation.

---

## 🚀 Features

- **🎮 Real-time Joint Control** - Individual control of all robot joints with precision sliders and input fields
- **🎯 URDF Parser** - Automatic parsing of InMoov URDF files to extract joint configurations and constraints
- **💾 Pose Management** - Save, load, and manage multiple robot poses with custom names
- **🔄 Drag & Drop Categories** - Reorganize joint categories (Head, Arms, Torso, etc.) via intuitive drag-and-drop
- **📐 Unit Conversion** - Toggle between degrees and radians for joint angle display
- **🤖 3D Robot Visualization** - Real-time 3D rendering of robot meshes with STL support
- **⚙️ Visual Controls** - Wireframe mode, grid display, transparency adjustment, and camera controls
- **🎨 Cyberpunk UI** - Terminal-inspired interface with signature green glow effects
- **📱 Responsive Design** - Works seamlessly across desktop and mobile devices
- **🔌 Connection Management** - Visual connection status and control interface
- **🔐 Secure Authentication** - Optional username and password protection with MD5 encryption
- **🌐 Custom ROS Bridge URL** - Configurable ROS Bridge connection with persistent settings

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root to configure the application:

```env
# ROS Bridge Server URL
VITE_ROS_BRIDGE_SERVER_URL=ws://localhost:9090

# Authentication (both required for password protection)
VITE_LOCAL_USERNAME=admin
VITE_LOCAL_PASSWORD=5d41402abc4b2a76b9719d911017c592

VITE_PORT=3000

VITE_ENABLE_LOGS=true
```

### Authentication Setup

1. **Username**: Set `VITE_LOCAL_USERNAME` to your desired username
2. **Password**: Set `VITE_LOCAL_PASSWORD` to the MD5 hash of your password
   - Generate MD5 hash: `echo -n "yourpassword" | md5sum`
   - Example: Password "lucy123" → MD5 hash "5d41402abc4b2a76b9719d911017c592"

**Note**: If either `VITE_LOCAL_USERNAME` or `VITE_LOCAL_PASSWORD` is not set, the application will run without authentication.

---

## 📖 Documentation

For more details on creation processes, troubleshooting, and other guidance, visit the [Sentience Robotics documentation](https://docs.sentience-robotics.fr).

---

## 📜 Code of Conduct

We value the participation of each member of our community and are committed to ensuring that every interaction is respectful and productive. To foster a positive environment, we ask you to read and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

By participating in this project, you agree to uphold this code in all your interactions, both online and offline. Let's work together to maintain a welcoming and inclusive community for everyone.

If you encounter any issues or have questions regarding the Code of Conduct, please contact us at [contact@sentience-robotics.fr](mailto:contact@sentience-robotics.fr).

Thank you for being a part of our community!

---

## 🤝 Contributing

To find out more on how you can contribute to the project, please check our [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📜 License and Attribution

### Project License

- **Original project code/files:** GNU GPL V3 License
- **InMoov-derived files:** CC BY-NC 4.0 (as specified under)
 
See the [LICENSE](LICENSE) file for details.

### InMoov-Derived Components

Parts of this project that are derived from InMoov files (including Blender models, CAD files, and STL files) are based on the original work by **Gael Langevin**.

**Original Work:** InMoov by Gael Langevin  
**License:** [Creative Commons Attribution-NonCommercial (CC BY-NC)](https://creativecommons.org/licenses/by-nc/4.0/)  
**Source:** http://inmoov.fr/  
**Applies to:** Blender files, CAD files, STL files, and other 3D models derived from InMoov

---

## 🙌 Acknowledgments

- 🎉 [InMoov Project](https://inmoov.fr/) – Original design by Gael Langevin<br>
- 🎉 **All contributors** to the InMoov community<br>
- 🎉 [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) – 3D rendering capabilities<br>
- 🎉 [Three.js](https://threejs.org/) – WebGL 3D graphics library<br>

---

## 📬 Contact

- 📧 Email: [contact@sentience-robotics.fr](mailto:contact@sentience-robotics.fr)<br>
- 🌍 GitHub Organization: [Sentience Robotics](https://github.com/sentience-robotics)<br>

---

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](code_of_conduct.md)
