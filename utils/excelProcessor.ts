import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';

export interface Slide {
  id: string;
  image: string;
  text: string;
  highlighted: string;
  style: string;
  backgroundVoice: string;
}

// New interface to store image info
export interface ImageInfo {
  uri: string;
  name: string;
}

export async function processExcelFile(excelUri: string, selectedImages: ImageInfo[]): Promise<Slide[]> {
  try {
    // Read the Excel file
    const fileContent = await FileSystem.readAsStringAsync(excelUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Parse the Excel file
    const workbook = XLSX.read(fileContent, { type: 'base64' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    });

    if (data.length < 2) { // At least header row and one data row
      throw new Error('Excel file is empty or has no data rows');
    }

    // Get headers from first row and normalize them
    const headerRow = data[0] as string[];
    const headers = headerRow.map(h => h.toString().toLowerCase().trim());
    console.log('Found headers:', headers);

    // Validate required columns
    const requiredColumns = ['image', 'text', 'highlighted', 'style', 'backgroundvoice'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Get column indices
    const columnIndices = {
      image: headers.indexOf('image'),
      text: headers.indexOf('text'),
      highlighted: headers.indexOf('highlighted'),
      style: headers.indexOf('style'),
      backgroundvoice: headers.indexOf('backgroundvoice')
    };

    console.log('Column indices:', columnIndices);
    console.log('Selected images:', selectedImages);

    // At the start of processExcelFile function, after getting headers
    // Create a mapping of Excel image names to actual image files
    const createImageMapping = (excelData: any[], selectedImages: ImageInfo[], imageColumnIndex: number) => {
      // Get all unique image names from Excel
      const excelImageNames = new Set<string>();
      for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i] as string[];
        const imageName = row[imageColumnIndex]?.toString().trim() || '';
        if (imageName) excelImageNames.add(imageName);
      }
      console.log('Excel image names:', Array.from(excelImageNames));

      // Sort images by their numeric values for better matching
      const sortedImages = [...selectedImages].sort((a, b) => {
        const aNum = parseInt(a.name.replace(/\D/g, ''));
        const bNum = parseInt(b.name.replace(/\D/g, ''));
        return aNum - bNum;
      });
      console.log('Sorted uploaded images:', sortedImages.map(img => img.name));

      // Create the mapping
      const imageMapping = new Map<string, string>();
      const excelNamesArray = Array.from(excelImageNames).filter(name => name);
      
      // Map each Excel image name to a corresponding uploaded image
      excelNamesArray.forEach((excelName, index) => {
        if (index < sortedImages.length) {
          imageMapping.set(excelName, sortedImages[index].uri);
          console.log(`Mapped "${excelName}" to "${sortedImages[index].name}"`);
        }
      });

      return imageMapping;
    };

    // In the main processing loop
    const imageMapping = createImageMapping(data, selectedImages, columnIndices.image);

    // Process data rows
    const slides: Slide[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as string[];
      
      // Skip empty rows
      if (row.every(cell => !cell)) continue;

      // Get values using column indices
      const imageValue = row[columnIndices.image]?.toString().trim() || '';
      const textValue = row[columnIndices.text] || '';
      const highlightedValue = row[columnIndices.highlighted] || '';
      const styleValue = row[columnIndices.style] || '';
      const backgroundVoiceValue = row[columnIndices.backgroundvoice] || '';

      // Get matching image from the mapping
      let matchingImage = 'No image selected';
      if (imageValue && imageMapping.has(imageValue)) {
        matchingImage = imageMapping.get(imageValue)!;
        console.log(`Using mapped image for "${imageValue}": ${matchingImage}`);
      } else if (imageValue) {
        console.warn(`No mapping found for image: ${imageValue}`);
      }

      const slide: Slide = {
        id: `slide-${slides.length + 1}`,
        image: matchingImage,
        text: textValue.toString(),
        highlighted: highlightedValue.toString(),
        style: styleValue.toString().toLowerCase() || 'normal',
        backgroundVoice: backgroundVoiceValue.toString()
      };

      console.log(`Created slide ${slides.length + 1}:`, {
        ...slide,
        imageName: imageValue
      });
      slides.push(slide);
    }

    if (slides.length === 0) {
      throw new Error('No valid slides found in the Excel file');
    }

    return slides;
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
} 