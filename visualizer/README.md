# Annotation Visualizer

A React.js application for visualizing images with bounding box annotations. This tool allows you to load images and their corresponding JSON annotation data, either from local files or from an FTP server, and provides interactive controls for validating and editing annotations.

## Features

- **Image Loading**: Load images from local disk or FTP server
- **Annotation Visualization**: Draw bounding boxes with class labels and confidence scores
- **Interactive Validation**: Mark annotations as valid/invalid
- **Annotation Editing**: Edit class names for annotations
- **Image Gallery**: Browse through multiple images with thumbnails
- **Zoom Controls**: Zoom in/out and reset zoom level
- **FTP Support**: Connect to FTP servers to load remote data
- **Responsive Design**: Works on desktop and mobile devices

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd visualizer/backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   python start.py --img-dir /path/to/your/images
   ```
   
   Or use the default images directory:
   ```bash
   python start.py
   ```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd visualizer/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

The application will automatically open in your default browser thanks to Vite's configuration.

## Usage

### Loading Local Files

1. Click "Load Image" to select an image file from your local disk
2. Click "Load Annotations" to select a corresponding JSON file with annotation data
3. The bounding boxes and labels will be automatically drawn on the image

### Connecting to FTP Server

1. Click the "FTP Settings" button in the header
2. Enter your FTP server details:
   - Host: FTP server address
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: FTP port (default: 21)
3. Click "Connect" to establish the connection
4. The application will automatically load available images and their annotations

### JSON Annotation Format

The application supports both Mapillary format and simple format:

#### Mapillary Format (Recommended)
```json
{
  "id": 104761199101235,
  "url": "https://example.com/image.jpg",
  "camera_type": "perspective",
  "lat": 43.65089644755702,
  "lon": -79.36953127384186,
  "creator": {
    "id": 110863471828488,
    "username": "isolwi"
  },
  "width": 4032,
  "height": 3024,
  "sequence": "QhLPOo8xXUbKBGWV9i0Sw2",
  "detections": [
    {
      "id": 104786775765344,
      "value": "regulatory--stop--g1",
      "geometry": "GiV4AgoGbXB5LW9yKIAgEhYYAwgBIhAJ1jicIBoArAKGAgAAqwIP",
      "bbox": [3570, 1522, 3699, 1633],
      "image_id": 104761199101235
    }
  ]
}
```

Where:
- `bbox`: Array `[x1, y1, x2, y2]` with top-left and bottom-right coordinates
- `value`: Class name in Mapillary format (e.g., "regulatory--stop--g1")
- `id`: Unique detection identifier
- `image_id`: Reference to the parent image
- `width`, `height`: Image dimensions
- `lat`, `lon`: GPS coordinates
- `creator`: Information about who created the annotation

### Validating Annotations

- Click the checkmark icon (✓) next to an annotation to mark it as valid
- Click the X icon to mark an annotation as invalid
- Validated annotations will be highlighted in green

### Editing Annotations

- Click the edit icon (pencil) next to an annotation to edit its class name
- Type the new class name and press Enter or click the save icon
- The changes will be reflected immediately on the canvas

### Navigation

- Use the "Previous" and "Next" buttons to navigate between images
- Click on thumbnails in the image gallery to jump to specific images
- Use zoom controls to zoom in/out on the current image

## Project Structure

The frontend code is placed in `frontend/` and the backend in `backend/`

## Image Directory Structure

The backend expects images to be organized as follows:

```
backend/images/
├── image_id_1/
│   ├── image_id_1.jpg
│   └── image_id_1.json
├── image_id_2/
│   ├── image_id_2.jpg
│   └── image_id_2.json
└── ...
```

Each directory should contain:
- A JPG image file named `{image_id}.jpg`
- A JSON annotation file named `{image_id}.json` in Mapillary format

## Dependencies

- **React**: UI framework
- **Lucide React**: Icon library
- **Axios**: HTTP client for API requests
- **FTP**: FTP client library

## Development

To build the application for production:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

To run linting:

```bash
npm run lint
```

## Vite Benefits

This application now uses Vite instead of Create React App, which provides:

- **Faster development server** with Hot Module Replacement (HMR)
- **Faster builds** using esbuild for dependencies
- **Better performance** with optimized bundling
- **Modern tooling** with native ES modules support
- **Smaller bundle size** with tree-shaking

## Browser Support

The application supports all modern browsers including:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
