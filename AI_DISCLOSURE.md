# 🤖 AI Disclosure: Meridian Cognitive OS

This document outlines the use of Artificial Intelligence in the Meridian project for the **Samsung OpenCLAW Hackathon 2026**.

## 🧠 AI Models & Frameworks Used
*   **Framework**: [Samsung OpenCLAW](https://openclaw.ai/) (Local AI Gateway)
*   **LLM Model**: Meta Llama 3.1 8B (via Groq Cloud)
*   **Inference Engine**: Groq (for low-latency response during the live demo)

## 🛠️ How AI is Integrated
Meridian uses AI to provide "Human-in-the-loop" cognitive coaching:
1.  **Narrative Insights**: OpenCLAW processes raw application usage telemetry (screen time) and transforms it into a coaching narrative using warm, human-like direct address.
2.  **Mental Snapshots**: The system uses LLM inference to summarize the user's active window context into a brief "Snapshot" to help with task resumption.
3.  **Pattern Detection**: While intervention is rule-based (Friction Screens), the AI is used to provide the context-aware advice shown during the 5-second delay.

## ⚖️ Responsible AI Practices
*   **Privacy-First (Ghost Layer)**: Users can toggle a "Ghost Layer" that explicitly redacts sensitive application names and window titles from the AI context window.
*   **Local Processing**: By utilizing the OpenCLAW gateway, Meridian ensures that user telemetry is filtered and managed locally before any inference calls are made.
*   **Human Agency**: Meridian never blocks the user. It utilizes "Friction Screens" to provide a pause, ensuring the user maintains final agency over their attention.

---
**Team Sam is Singing**  
*MSRIT, 2026*
