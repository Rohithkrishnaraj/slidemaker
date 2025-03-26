import { useState } from 'react';
import { StyleSheet, View, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Button, Text, Card, Portal, Dialog, DataTable } from 'react-native-paper';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { processExcelFile, Slide, ImageInfo } from '../utils/excelProcessor';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';

interface ExcelPreviewData {
  image: string;
  text: string;
  highlighted: string;
  style: string;
  backgroundvoice: string;
}

interface UploadScreenState {
  selectedImages: ImageInfo[];
  excelFile: string | null;
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  excelPreview: ExcelPreviewData[] | null;
  isSelectingFiles: boolean;
}

export default function UploadScreen() {
  const [state, setState] = useState<UploadScreenState>({
    selectedImages: [],
    excelFile: null,
    loading: false,
    loadingMessage: '',
    error: null,
    excelPreview: null,
    isSelectingFiles: false
  });

  const handleUpload = async () => {
    try {
      // Set initial loading state for image selection
      setState(prev => ({ 
        ...prev, 
        loading: true,
        loadingMessage: 'Please select images first...',
        error: null 
      }));

      // Wait for 3 seconds before opening image picker
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          error: 'Permission to access media library is required',
          loading: false 
        }));
        return;
      }

      // First, pick images
      console.log('Opening image picker...');
      const imageResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      console.log('Image picker result:', imageResult);
      if (imageResult.canceled) {
        console.log('Image selection was canceled');
        setState(prev => ({ 
          ...prev, 
          loading: false,
          loadingMessage: '' 
        }));
        return;
      }

      if (!imageResult.assets || imageResult.assets.length === 0) {
        setState(prev => ({ 
          ...prev, 
          error: 'Please select at least one image',
          loading: false,
          loadingMessage: '' 
        }));
        return;
      }

      // Update loading state for file selection
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Now select Excel file...',
        isSelectingFiles: true 
      }));

      // Wait for 3 seconds before opening file picker
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Convert selected assets to ImageInfo objects with original filenames
      const imageInfos: ImageInfo[] = await Promise.all(imageResult.assets.map(async (asset, index) => {
        let uri = asset.uri;
        
        // Get the original filename from the asset
        const originalFilename = asset.fileName || `${index + 1}.png`;
        console.log(`Original filename for image ${index + 1}:`, originalFilename);
        
        // For Android, we need to copy the file to app's document directory for persistence
        if (Platform.OS === 'android') {
          const docUri = `${FileSystem.documentDirectory}${originalFilename}`;
          
          try {
            await FileSystem.copyAsync({
              from: asset.uri,
              to: docUri
            });
            console.log(`Successfully copied image to: ${docUri}`);
            uri = docUri;
          } catch (error) {
            console.error('Error copying file:', error);
            throw new Error('Failed to copy image file');
          }
        }

        return {
          uri: uri,
          name: originalFilename
        };
      }));

      // Log all processed images
      console.log('All processed images:', imageInfos.map(info => ({
        name: info.name,
        uri: info.uri
      })));

      // Then, pick Excel file
      console.log('Opening Excel file picker...');
      const excelResult = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true
      });

      console.log('Excel picker result:', excelResult);
      if (excelResult.canceled || !excelResult.assets || excelResult.assets.length === 0) {
        console.log('Excel selection was canceled or no file was selected');
        setState(prev => ({ 
          ...prev, 
          loading: false,
          loadingMessage: '',
          isSelectingFiles: false 
        }));
        return;
      }

      // Update loading state for processing
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Processing files, please wait...' 
      }));

      // Wait for 3 seconds before processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const excelUri = excelResult.assets[0].uri;
      console.log('Selected Excel URI:', excelUri);

      // Read and preview Excel data
      const fileContent = await FileSystem.readAsStringAsync(excelUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON with headers
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: ''
      });

      if (data.length < 2) {
        throw new Error('Excel file is empty or has no data rows');
      }

      // Get headers and normalize them
      const headerRow = data[0] as string[];
      const headers = headerRow.map(h => h.toString().toLowerCase().trim());
      console.log('Excel headers:', headers);

      // Validate required columns
      const requiredColumns = ['image', 'text', 'highlighted', 'style', 'backgroundvoice'];
      const missingColumns = requiredColumns.filter(col => 
        !headers.some(h => h === col || h === col.charAt(0).toUpperCase() + col.slice(1))
      );

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Get column indices (case insensitive)
      const columnIndices = {
        image: headers.findIndex(h => h === 'image' || h === 'Image'),
        text: headers.findIndex(h => h === 'text' || h === 'Text'),
        highlighted: headers.findIndex(h => h === 'highlighted' || h === 'Highlighted'),
        style: headers.findIndex(h => h === 'style' || h === 'Style'),
        backgroundvoice: headers.findIndex(h => h === 'backgroundvoice' || h === 'backgroundVoice' || h === 'BackgroundVoice')
      };
      console.log('Column indices:', columnIndices);

      // Process data rows
      const previewData: ExcelPreviewData[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as string[];
        if (row.every(cell => !cell)) continue; // Skip empty rows

        previewData.push({
          image: row[columnIndices.image] || '-',
          text: row[columnIndices.text] || '-',
          highlighted: row[columnIndices.highlighted] || '-',
          style: row[columnIndices.style] || '-',
          backgroundvoice: row[columnIndices.backgroundvoice] || '-'
        });
      }

      console.log('Preview data created:', previewData.length, 'rows');

      // Update final state
      setState(prev => ({
        ...prev,
        selectedImages: imageInfos,
        excelFile: excelUri,
        excelPreview: previewData,
        loading: false,
        loadingMessage: '',
        isSelectingFiles: false
      }));

    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error during upload',
        loading: false,
        loadingMessage: '',
        isSelectingFiles: false
      }));
    }
  };

  const handleGenerate = async () => {
    if (!state.excelFile) {
      setState(prev => ({ ...prev, error: 'Please select an Excel file' }));
      return;
    }
    if (state.selectedImages.length === 0) {
      setState(prev => ({ ...prev, error: 'Please select at least one image' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const slides = await processExcelFile(state.excelFile, state.selectedImages);
      router.push({
        pathname: '/preview',
        params: { slides: JSON.stringify(slides) }
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error generating slides'
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Upload Files</Text>
            <Text style={styles.excelFormat}>
              Excel file must contain: image, text, highlighted, style, backgroundvoice columns
            </Text>
            <Button
              mode="contained"
              onPress={handleUpload}
              style={styles.button}
              icon="upload"
              disabled={state.loading}
            >
              Select Images & Excel File
            </Button>

            {state.loading && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loaderText}>{state.loadingMessage}</Text>
              </View>
            )}

            <View style={styles.uploadInfo}>
              {state.selectedImages.length > 0 && (
                <Text style={styles.infoText}>
                  Selected Images: {state.selectedImages.length}
                </Text>
              )}
              {state.excelFile && (
                <Text style={styles.infoText}>
                  Excel File: {state.excelFile.split('/').pop()}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        {state.excelPreview && state.excelPreview.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>Excel Preview</Text>
              <ScrollView horizontal style={styles.tableContainer}>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title style={styles.tableCell}>Image</DataTable.Title>
                    <DataTable.Title style={styles.tableCell}>Text</DataTable.Title>
                    <DataTable.Title style={styles.tableCell}>Highlighted</DataTable.Title>
                    <DataTable.Title style={styles.tableCell}>Style</DataTable.Title>
                    <DataTable.Title style={styles.tableCell}>Voice</DataTable.Title>
                  </DataTable.Header>

                  {state.excelPreview.slice(0, 5).map((row, index) => (
                    <DataTable.Row key={index}>
                      <DataTable.Cell style={styles.tableCell}>{row.image}</DataTable.Cell>
                      <DataTable.Cell style={styles.tableCell}>{row.text}</DataTable.Cell>
                      <DataTable.Cell style={styles.tableCell}>{row.highlighted}</DataTable.Cell>
                      <DataTable.Cell style={styles.tableCell}>{row.style}</DataTable.Cell>
                      <DataTable.Cell style={styles.tableCell}>{row.backgroundvoice}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>
              {state.excelPreview.length > 5 && (
                <Text style={styles.previewNote}>
                  Showing first 5 rows. Total rows: {state.excelPreview.length}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <Button
          mode="contained"
          onPress={handleGenerate}
          style={styles.generateButton}
          loading={state.loading}
          disabled={state.loading || !state.excelFile || state.selectedImages.length === 0}
        >
          Generate Slides
        </Button>
      </View>

      <Portal>
        <Dialog visible={!!state.error} onDismiss={() => setState(prev => ({ ...prev, error: null }))} style={styles.errorDialog}>
          <Dialog.Title>Error</Dialog.Title>
          <Dialog.Content>
            <Text>{state.error}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setState(prev => ({ ...prev, error: null }))} style={styles.errorButton}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 16,
  },
  excelFormat: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  button: {
    marginBottom: 16,
  },
  uploadInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  generateButton: {
    borderRadius: 8,
  },
  previewNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tableContainer: {
    marginBottom: 8,
  },
  tableCell: {
    minWidth: 120,
    maxWidth: 200,
  },
  errorDialog: {
    backgroundColor: '#fff',
  },
  errorButton: {
    backgroundColor: '#007bff',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
  },
  loaderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
}); 