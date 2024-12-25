# Video Conferencing Application

## Developer / Author / Engineer: Salman Ahmed Khan

## To Run the Code/Project

1. Clone the project.  
2. Run the Dockerfile to build an image.  
3. Run the Docker Compose file to start the container.  
4. Open the container using the **Dev Container** extension in VS Code or through a bash terminal.  
5. Clone the project again inside the container.  
6. Finally, run the following commands in both the client and server directories:  
   - `npm install`  
   - `npm run build` (only for the client)  
   - `npm start`  



## Introduction
This project outlines the development journey of a custom-built video conferencing application. The objective of the project was to create a scalable and efficient platform for real-time video communication without relying on third-party SDKs or libraries. The application leverages WebRTC, MediaSoup, and modern deployment strategies to achieve its goals.

## Objectives
The primary goals of this project were:
- Learn and implement WebRTC for video calling functionality.
- Achieve scalability for group video calls using advanced architectures.
- Understand and integrate media server solutions like SFU and MCU.
- Deploy the application on a robust infrastructure, ensuring high availability and scalability.
- Optimize performance and user experience for real-time communication.

## Features
- **Video and Audio Calls**: Seamless peer-to-peer and group video calls with high-quality streaming.
- **Screen Sharing**: Participants can share their screens for presentations and collaborations.
- **Text Chat**: Integrated text chat functionality for instant messaging during calls.
- **File Sharing**: Secure file sharing to enhance collaboration.
- **Advanced Moderation Tools**: Host controls for managing participants, muting users, and removing disruptive individuals.
- **Dynamic Room Management**: Custom room creation and management for group calls.
- **Scalable Worker System**: Automatic scaling of MediaSoup workers to handle large user bases.

## Learning Journey and Implementation

### Phase 1: Understanding WebRTC
WebRTC is the backbone of real-time communication on the web, enabling audio, video, and data sharing directly between browsers and devices. 

- **Key Concepts Learned**:
  - **Session Description Protocol (SDP)**: Used for negotiating media capabilities between peers.
  - **STUN and TURN Servers**: STUN servers assist in obtaining public IP addresses for peers, while TURN servers relay media when direct peer-to-peer connections fail.
  - **ICE Candidates and ICE Negotiations**: Critical for establishing and maintaining connectivity between peers by exchanging potential connection paths.
  
- **Implementation**:
  - A basic peer-to-peer video calling feature was developed using WebRTC, ensuring low latency and high-quality video transmission.
  
- **Challenges**:
  - Understanding and configuring STUN/TURN servers.
  - Debugging connection issues caused by network variations and NAT traversal.

### Phase 2: Group Video Calling
Enabling group video calls required addressing the scalability limitations of WebRTC's native peer-to-peer architecture.

- **Initial Approach**:
  - Implemented a mesh architecture, where each participant establishes a direct connection with every other participant. This approach worked for small groups (2-3 users) but became resource-intensive for larger groups.

- **Exploration of Architectures**:
  - **MCU (Multipoint Control Unit)**: A centralized server mixes and processes media streams before distributing them to participants.
  - **SFU (Selective Forwarding Unit)**: A centralized server forwards media streams to participants without processing them, making it more cost-effective and suitable for larger groups.

### Phase 3: Building and Using an SFU
Implemented an SFU for group video calling to address the limitations of mesh architecture and the cost concerns of MCU.

- **Custom SFU Attempt**:
  - Developed a basic SFU to forward streams between participants.
  - Gained insights into the complexities of SFU development, particularly in terms of networking, synchronization, and scalability.

- **Adopting MediaSoup**:
  - Evaluated various SFU solutions, including Janus and MediaSoup, and selected MediaSoup for its flexibility, documentation, and active community support.

- **MediaSoup Features Implemented**:
  - **Simulcast Bitrate Video**: Producers send video/audio/data streams to the SFU with multiple bitrates, and consumers subscribe to the desired stream quality based on their network conditions.
  - **Room Management**: Built custom room functionality using WebSocket for managing user sessions.
  - **Scalable Workers**: Designed MediaSoup workers to scale dynamically, spinning up new workers automatically when existing workers reach their user capacity.

## Deployment Strategy

### Testing Environment
- Deployed the application on an **AWS EC2 instance**.
- Used **NGINX** for reverse proxying and **TMUX** for managing frontend and backend processes on the same instance.

### Production Environment (Planned)
- Utilized **Kubernetes** for container orchestration.
- Enabled features like **auto-scaling**, **rolling updates**, and seamless deployment of new features.
- Ensured **fault tolerance** and high availability across services.

## Technologies Used
- **Frontend Technologies**:
  - Next.js for building the user interface.
  - Zustand for state management, ensuring a responsive and intuitive user experience.
  
- **Backend Technologies**:
  - Express.js and Node.js for handling API requests and WebSocket connections.

- **Real-Time Communication**:
  - WebRTC for peer-to-peer communication.
  - WebSocket for signaling and room management.
  - MediaSoup for scalable media handling and SFU functionality.

- **Deployment Tools**:
  - AWS EC2 for hosting and initial testing.
  - NGINX and TMUX for process management.

- **Video Streaming Features**:
  - Simulcast bitrate handling for adaptive streaming quality.

## Challenges and Solutions
- **Scalability in Group Calls**: Transitioned from a mesh architecture to MediaSoup’s SFU for better scalability.
- **Custom Room Management**: Implemented a WebSocket-based solution for managing rooms and user sessions.
- **Worker Scalability**: Designed dynamic worker scaling to ensure uninterrupted service during high user loads.
- **Deployment and Testing**: Leveraged AWS EC2 for testing and planned Kubernetes integration for production readiness.

## Future Enhancements
- **Advanced Features**:
  - Enhance screen sharing, text chat, and file sharing functionalities.
  - Expand advanced moderation tools for more granular participant management.
  
- **UI/UX Improvements**:
  - Improve the user interface for better usability and accessibility.
  - Introduce mobile app support for cross-platform compatibility.

- **Production Deployment**:
  - Complete the transition to Kubernetes for production environments.
  - Integrate CI/CD pipelines for streamlined development and deployment.

## Conclusion
This project was a comprehensive learning experience in video streaming, real-time communication, and scalable application development. By integrating WebRTC, MediaSoup, and modern deployment strategies, the application successfully delivers a functional video conferencing platform with potential for further growth and optimization.

## Acknowledgments
I extend my gratitude to the resources, tutorials, and communities that provided invaluable guidance and support throughout the development journey. Their insights were instrumental in overcoming challenges and achieving the project’s objectives.
