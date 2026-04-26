# 🚦 AI-Driven Adaptive Traffic Optimization and Emergency Corridor System

An AI-powered traffic optimization system using computer vision and a multi-agent architecture to analyze traffic conditions, predict congestion, and improve signal efficiency.
---
## 📌 Project Overview

SmartFlow AI simulates an intelligent traffic control system by combining **YOLO-based vehicle detection** with a **CrewAI multi-agent framework**.

| Feature      | Details                             |
| ------------ | ----------------------------------- |
| Input        | Traffic video / image frames        |
| Detection    | YOLO (vehicle detection & counting) |
| Intelligence | CrewAI multi-agent system           |
| Backend      | Python + Flask                      |
| Mode         | Simulation / demo-based             |

---

## 🧠 System Architecture

```
┌──────────────────────────────────────────────┐
│           INPUT (Video / Frames)             │
└────────────────────┬─────────────────────────┘
                     │
             YOLO Vehicle Detection
                     │
        Vehicle Count + Density Estimation
                     │
┌────────────────────▼─────────────────────────┐
│        CrewAI Multi-Agent System             │
│                                             │
│  Traffic Analyzer Agent                     │
│  Prediction Agent                           │
│  Signal Optimization Agent                  │
│  Emergency Agent                            │
│  Feedback Learning Agent                    │
└────────────────────┬─────────────────────────┘
                     │
        Signal Timing Decisions + Insights
                     │
             Output / Visualization
```

---

## 🤖 Multi-Agent Design (CrewAI)

| Agent                     | Role                                           |
| ------------------------- | ---------------------------------------------- |
| Traffic Analyzer Agent    | Analyzes vehicle density & congestion          |
| Prediction Agent          | Predicts short-term traffic patterns           |
| Signal Optimization Agent | Calculates optimal signal timing               |
| Emergency Agent           | Detects emergency vehicles & triggers priority |
| Feedback Learning Agent   | Improves system using feedback                 |

---

## Demo video:
https://github.com/user-attachments/assets/add2223e-f04b-47fb-9262-8f30f820ade1

---



## ⚙️ Tech Stack

* **Python**
* **OpenCV**
* **YOLO (Object Detection)**
* **TensorFlow / CNN**
* **CrewAI (Multi-Agent System)**
* **Flask (Backend API)**

---

## 🚀 Key Features

### 1️⃣ Vehicle Detection

Detects and counts vehicles using YOLO from traffic frames.

### 2️⃣ Traffic Density Analysis

Classifies traffic as low, medium, or high congestion.

### 3️⃣ Congestion Prediction

Uses historical + simulated data to predict traffic trends.

### 4️⃣ Adaptive Signal Control

Dynamically adjusts signal timing based on traffic conditions.

### 5️⃣ Emergency Handling

Detects emergency vehicles and enables green corridor simulation.

### 6️⃣ Feedback Learning

Continuously improves decisions based on system performance.

---

## 📂 Project Structure

```
smartflow-ai-traffic-system/
│
├── agents/              # CrewAI agents
├── models/              # ML/DL models
├── data/                # Input datasets / samples
├── app.py               # Main application
├── utils/               # Helper functions
├── requirements.txt     # Dependencies
├── frontend/            # Next.js Frontend
├── backend/             # Flask Backend
└── README.md
```

---

## 🚀 How to Run

### Step 1 – Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2 – Run Application

```bash
python app.py
```

### Step 3 – Input Data

* Provide video/image input
* System processes and outputs traffic insights

---

## 🔮 Future Enhancements

* Real-time traffic data integration (CCTV / IoT)
* Cloud deployment (AWS / GCP)
* Reinforcement learning for signal optimization
* Multi-intersection traffic coordination
* Dashboard for traffic visualization
