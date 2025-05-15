"""
Image comparison utility for visual regression testing.
"""
import sys
import cv2
import numpy as np

def compare_images(img1_path, img2_path, threshold=0.95):
    """
    Compare two images and return True if they are similar enough.
    
    Args:
        img1_path: Path to first image
        img2_path: Path to second image
        threshold: Similarity threshold (0.0-1.0)
        
    Returns:
        0 if images are similar, 1 otherwise
    """
    try:
        # Load images
        img1 = cv2.imread(img1_path)
        img2 = cv2.imread(img2_path)
        
        # Check if images were loaded successfully
        if img1 is None or img2 is None:
            print(f"Error: Could not load images {img1_path} or {img2_path}")
            return 1
        
        # Resize if dimensions don't match
        if img1.shape != img2.shape:
            img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
        
        # Calculate difference
        diff = cv2.absdiff(img1, img2)
        diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        
        # Threshold the difference
        _, threshold_diff = cv2.threshold(diff_gray, 30, 255, cv2.THRESH_BINARY)
        
        # Calculate similarity
        similarity = 1 - (np.count_nonzero(threshold_diff) / threshold_diff.size)
        
        # Save difference image for inspection
        output_path = img1_path.replace('.png', '_diff.png')
        cv2.imwrite(output_path, threshold_diff)
        
        print(f"Similarity: {similarity:.4f}")
        
        # Return result based on threshold
        if similarity >= threshold:
            return 0
        else:
            print(f"Images differ more than threshold allows: {similarity:.4f} < {threshold}")
            return 1
            
    except Exception as e:
        print(f"Error comparing images: {e}")
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python compare_images.py <image1_path> <image2_path> [threshold]")
        sys.exit(1)
    
    img1_path = sys.argv[1]
    img2_path = sys.argv[2]
    threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.95
    
    sys.exit(compare_images(img1_path, img2_path, threshold))
