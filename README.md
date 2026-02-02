# Automatic Google Doodle Hoops Recorder

An intelligent screen recording tool designed specifically for the Google Doodle Basketball. It uses computer vision (via the Gemini API) to automatically monitor your gameplay, detect when a run finishes, read the final score, and intelligently manage your recording library.

## Features

- **Automated Recording**: Starts and stops recordings based on game state detection.
- **AI Score Detection**: Uses Multimodal AI to read the score directly from the screen pixels.
- **High Score Filtering**: Automatically discards attempts with a score lower than 45, keeping your storage clean and focused on your best runs.
- **Browser-Based**: Runs entirely in the browser using the Screen Capture API.

## How to Use

1. **Launch the App**: Open this application in your browser.
2. **Open the Game**: Open your basketball game in a separate tab or window.
3. **Start Monitoring**: Click "Select Game Tab" in this app and select the tab containing the game.
   - *Note: Ensure you share the specific tab, not the whole window, for best results.*
4. **Play**: Play the game as usual.
5. **Review**: 
   - When you finish a game, the AI detects the "Game Over" screen.
   - If your score is **45 or higher**, the video is saved to the "Session History" list.
   - If the score is lower, the video is discarded to save space.
   - You can download your best runs directly from the history panel.

## Requirements

- A modern web browser supporting `getDisplayMedia` (e.g., Chrome, Edge, Firefox).
- An active internet connection for AI analysis.
- An API Key for the Gemini API (configured via environment variables).

## Technical Details

The application captures a video stream of the selected tab. Every few seconds, it sends a frame to the Gemini Flash model to analyze the game state ("Is the game over?", "What is the score?"). When a "Game Over" state is detected, it compares the visible score against the threshold (45). If successful, the buffered video is finalized and offered for download.
