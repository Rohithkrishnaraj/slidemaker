import { useState, useEffect } from 'react';
import { StyleSheet, View, Image, Dimensions, Platform } from 'react-native';
import { Button, Text, IconButton, Portal, Dialog, TextInput } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slide } from '../utils/excelProcessor';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

export default function PreviewScreen() {
  const params = useLocalSearchParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [slideName, setSlideName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [saveType, setSaveType] = useState<'single' | 'grouped' | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (params.slides) {
      try {
        const parsedSlides = JSON.parse(params.slides as string);
        setSlides(parsedSlides);
      } catch (error) {
        console.error('Error parsing slides:', error);
      }
    }
  }, [params.slides]);

  useEffect(() => {
    if (params.updatedSlide && params.index) {
      try {
        const updatedSlide = JSON.parse(params.updatedSlide as string);
        const slideIndex = parseInt(params.index as string);
        
        setSlides(prevSlides => {
          const newSlides = [...prevSlides];
          newSlides[slideIndex] = {
            ...newSlides[slideIndex],
            ...updatedSlide
          };
          return newSlides;
        });
        
        setCurrentSlide(slideIndex);
      } catch (error) {
        console.error('Error updating slide:', error);
      }
    }
  }, [params.updatedSlide, params.index]);

  const handleSave = () => {
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = () => {
    if (!slideName.trim()) return;
    setShowSaveDialog(false);
    setShowGroupDialog(true);
  };

  const handleGroupSelect = (type: 'new' | 'existing') => {
    if (type === 'new') {
      setShowGroupDialog(false);
      // Handle new group creation
    } else {
      // Show existing groups list
    }
  };

  const handleSaveComplete = () => {
    // Save the slide and navigate
    router.push('/my-slides');
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    const newSlides = slides.filter((_, index) => index !== currentSlide);
    setSlides(newSlides);
    if (currentSlide >= newSlides.length) {
      setCurrentSlide(Math.max(0, newSlides.length - 1));
    }
    setShowDeleteDialog(false);
  };

  const handleEdit = () => {
    router.push({
      pathname: '/edit',
      params: {
        slide: JSON.stringify(slides[currentSlide]),
        index: currentSlide.toString(),
        totalSlides: slides.length.toString()
      }
    });
  };

  const handlePresentation = () => {
    router.push({
      pathname: '/presentation',
      params: { slides: JSON.stringify(slides) }
    });
  };

  const verifyImage = async (uri: string) => {
    try {
      console.log('Verifying image:', uri);
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('File info:', fileInfo);

      if (!fileInfo.exists && uri.startsWith('file://')) {
        // Try without file:// prefix
        const withoutPrefix = uri.replace('file://', '');
        const fallbackInfo = await FileSystem.getInfoAsync(withoutPrefix);
        console.log('Fallback file info:', fallbackInfo);
        return fallbackInfo.exists;
      }

      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking file:', error);
      return false;
    }
  };

  const handleImageError = async (error: any) => {
    console.error('Image loading error:', error);
    const uri = slides[currentSlide]?.image;
    console.log('Attempted image URI:', uri);
    
    if (uri) {
      const exists = await verifyImage(uri);
      console.log('Image exists:', exists);
      
      // Try to get file info
      try {
        // Check if the image is in the document directory
        const filename = uri.split('/').pop();
        const docUri = `${FileSystem.documentDirectory}${filename}`;
        console.log('Checking document directory path:', docUri);
        
        const docInfo = await FileSystem.getInfoAsync(docUri);
        console.log('Document directory file info:', docInfo);
        
        if (docInfo.exists) {
          // Update the slide with the correct path
          const updatedSlides = [...slides];
          updatedSlides[currentSlide] = {
            ...slides[currentSlide],
            image: docUri
          };
          setSlides(updatedSlides);
          setImageError(false);
          return;
        }
      } catch (e) {
        console.error('Error checking document directory:', e);
      }
    }
    
    setImageError(true);
  };

  const currentSlideData = slides[currentSlide];

  if (!currentSlideData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>No slides available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.slideCount}>
          <Text variant="titleMedium">
            Slide {currentSlide + 1} of {slides.length}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="pencil" onPress={handleEdit} />
          <IconButton icon="delete" onPress={handleDelete} />
          <IconButton icon="play" onPress={handlePresentation} />
        </View>
      </View>

      <View style={styles.slideContainer}>
        {currentSlideData.image === 'No image selected' ? (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No image selected</Text>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image
              source={{ 
                uri: currentSlideData.image,
                cache: 'force-cache'
              }}
              style={styles.slideImage}
              resizeMode="contain"
              onError={handleImageError}
            />
            {imageError && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorText}>Error loading image</Text>
                <Text style={styles.errorPath}>Path: {currentSlideData.image}</Text>
                <Text style={styles.errorNote}>Platform: {Platform.OS}</Text>
                <Text style={styles.errorNote}>Location: {FileSystem.documentDirectory}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.slideContent}>
          <Text style={[
            styles.slideText,
            currentSlideData.style === 'bold' && styles.boldText,
            currentSlideData.style === 'italic' && styles.italicText,
          ]}>
            {currentSlideData.text || 'No text provided'}
          </Text>
          {currentSlideData.highlighted && (
            <Text style={styles.highlightedText}>
              Highlighted: {currentSlideData.highlighted}
            </Text>
          )}
          {currentSlideData.backgroundVoice && (
            <Text style={styles.ttsText}>
              Voice: {currentSlideData.backgroundVoice}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <IconButton
          icon="chevron-left"
          onPress={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
          disabled={currentSlide === 0}
        />
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          Save
        </Button>
        <IconButton
          icon="chevron-right"
          onPress={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
          disabled={currentSlide === slides.length - 1}
        />
      </View>

      <Portal>
        <Dialog visible={showSaveDialog} onDismiss={() => setShowSaveDialog(false)}>
          <Dialog.Title>Save Slide</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Slide Name"
              value={slideName}
              onChangeText={setSlideName}
              style={styles.input}
            />
            <View style={styles.saveTypeContainer}>
              <Button
                mode={saveType === 'single' ? 'contained' : 'outlined'}
                onPress={() => setSaveType('single')}
                style={styles.saveTypeButton}
              >
                Single
              </Button>
              <Button
                mode={saveType === 'grouped' ? 'contained' : 'outlined'}
                onPress={() => setSaveType('grouped')}
                style={styles.saveTypeButton}
              >
                Grouped
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onPress={handleSaveConfirm}>Next</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showGroupDialog} onDismiss={() => setShowGroupDialog(false)}>
          <Dialog.Title>Select Group</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="New Group Name"
              value={groupName}
              onChangeText={setGroupName}
              style={styles.input}
            />
            <View style={styles.groupButtons}>
              <Button
                mode="outlined"
                onPress={() => handleGroupSelect('existing')}
                style={styles.groupButton}
              >
                Existing Group
              </Button>
              <Button
                mode="contained"
                onPress={() => handleGroupSelect('new')}
                style={styles.groupButton}
              >
                New Group
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowGroupDialog(false)}>Cancel</Button>
            <Button onPress={handleSaveComplete}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Slide</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this slide?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={confirmDelete} textColor="red">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  slideCount: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
  },
  slideContainer: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    width: width * 0.9,
    height: height * 0.4,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 16,
  },
  noImageContainer: {
    width: width * 0.9,
    height: height * 0.4,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 8,
    marginBottom: 16,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  errorPath: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  noImageText: {
    color: '#666',
    fontSize: 16,
  },
  slideContent: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  slideText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  h1Text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  h2Text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  h3Text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  highlightedText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
  },
  ttsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    borderRadius: 8,
  },
  input: {
    marginBottom: 16,
  },
  saveTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  saveTypeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  groupButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  groupButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  errorNote: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
  },
}); 