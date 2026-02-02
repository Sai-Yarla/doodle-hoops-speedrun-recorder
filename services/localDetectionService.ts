import { AnalysisResult } from "../types";

/**
 * Local Detection Service
 * 
 * Instead of using AI, this service analyzes the pixel data of the canvas 
 * to find the visual signature of the Game Over screen.
 * 
 * Signature to look for (Center column scan):
 * 1. Top region (approx 15-30% Y): Solid Blue (The Ribbon)
 * 2. Gap (Background)
 * 3. Mid region (approx 40-60% Y): Solid Green (The Replay Button)
 * 4. Bottom region (approx 60-80% Y): Solid White (The URL Box)
 */

// Approximate RGB values for the game elements
const TARGET_BLUE = { r: 66, g: 133, b: 244 }; // Google Blue
const TARGET_GREEN = { r: 52, g: 168, b: 83 }; // Google Green
const COLOR_TOLERANCE = 70; // Euclidean distance allowance (Increased slightly for robustness)

const colorMatch = (r: number, g: number, b: number, target: { r: number, g: number, b: number }) => {
  const distance = Math.sqrt(
    Math.pow(r - target.r, 2) + 
    Math.pow(g - target.g, 2) + 
    Math.pow(b - target.b, 2)
  );
  return distance < COLOR_TOLERANCE;
};

const isWhiteish = (r: number, g: number, b: number) => {
  // Check for the white URL box background
  return r > 220 && g > 220 && b > 220;
};

export const analyzeGameFrameLocally = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number
): AnalysisResult => {
  try {
    const centerX = Math.floor(width / 2);
    // Scan a strip around the center to be more robust against slight centering offsets
    const scanWidth = 20; 
    const startX = Math.max(0, centerX - (scanWidth / 2));
    
    // Get pixel data for the center strip
    const frameData = ctx.getImageData(startX, 0, scanWidth, height).data;

    let blueRows = 0;
    let greenRows = 0;
    let whiteRows = 0;

    // Analyze row by row within the strip
    for (let y = 0; y < height; y++) {
      let rowBlueCount = 0;
      let rowGreenCount = 0;
      let rowWhiteCount = 0;

      for (let x = 0; x < scanWidth; x++) {
        const index = (y * scanWidth + x) * 4;
        const r = frameData[index];
        const g = frameData[index + 1];
        const b = frameData[index + 2];

        if (colorMatch(r, g, b, TARGET_BLUE)) rowBlueCount++;
        if (colorMatch(r, g, b, TARGET_GREEN)) rowGreenCount++;
        if (isWhiteish(r, g, b)) rowWhiteCount++;
      }

      const yPercent = y / height;
      const threshold = scanWidth * 0.4; // 40% of the strip width must match

      // Top area: Look for Blue Ribbon
      if (yPercent < 0.40 && rowBlueCount > threshold) {
        blueRows++;
      }
      
      // Middle area: Look for Green Button
      if (yPercent > 0.30 && yPercent < 0.70 && rowGreenCount > threshold) {
        greenRows++;
      }

      // Bottom area: Look for White URL Box
      // The URL box is usually below the button
      if (yPercent > 0.50 && yPercent < 0.85 && rowWhiteCount > threshold) {
        whiteRows++;
      }
    }

    // Heuristics: require a certain amount of vertical pixels to match
    // 2% of height (~7px on 360p) is a safe minimum
    const hasRibbon = blueRows > (height * 0.02); 
    const hasButton = greenRows > (height * 0.02);
    const hasUrlBox = whiteRows > (height * 0.02);

    // Decision Logic:
    // We strictly require the Blue Ribbon (Score)
    // AND either the Replay Button OR the URL Box (as a fallback)
    const isGameOver = hasRibbon && (hasButton || hasUrlBox);

    return {
      isGameOver,
      score: null, // Local mode cannot read score
      confidence: isGameOver ? 1.0 : 0.0
    };

  } catch (error) {
    console.error("Local Analysis Failed:", error);
    return { isGameOver: false, score: null, confidence: 0 };
  }
};