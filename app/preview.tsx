import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Image, Dimensions, Platform, ScrollView, Alert } from 'react-native';
import { Button, Text, IconButton, Portal, Dialog, TextInput, MD3Colors } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slide } from '../utils/excelProcessor';
import * as FileSystem from 'expo-file-system';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface SavedSlideSet {
  id: string;
  name: string;
  content: Slide[];
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  slides: SavedSlideSet[];
  createdAt: string;
  isFavorite?: boolean;
}

// Add this new component before the PreviewScreen component
const SaveDialog = ({ 
  visible, 
  onDismiss, 
  onSave, 
  initialSlideName = '' 
}: { 
  visible: boolean; 
  onDismiss: () => void; 
  onSave: (name: string, type: 'single' | 'grouped') => void;
  initialSlideName?: string;
}) => {
  const [slideName, setSlideName] = useState(initialSlideName);
  const [saveType, setSaveType] = useState<'single' | 'grouped'>('single');

  useEffect(() => {
    if (visible) {
      setSlideName(initialSlideName);
      setSaveType('single');
    }
  }, [visible, initialSlideName]);

  const handleDismiss = () => {
    if (slideName !== initialSlideName) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to leave?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            onPress: () => {
              setSlideName('');
              setSaveType('single');
              onDismiss();
            },
          },
        ]
      );
    } else {
      setSlideName('');
      setSaveType('single');
      onDismiss();
    }
  };

  return (
    <Dialog visible={visible} onDismiss={handleDismiss}>
      <Dialog.Title>Save Slides</Dialog.Title>
      <Dialog.Content>
        <TextInput
          label="Name"
          value={slideName}
          style={styles.input}
          mode="outlined"
          autoFocus
          placeholder={saveType === 'single' ? "Enter slide name" : "Enter group name"}
          error={!slideName.trim()}
          onChangeText={setSlideName}
          blurOnSubmit={false}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          returnKeyType="done"
          enablesReturnKeyAutomatically={true}
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
            Group
          </Button>
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleDismiss}>Cancel</Button>
        <Button 
          onPress={() => onSave(slideName, saveType)}
          disabled={!slideName.trim()}
        >
          {saveType === 'grouped' ? 'Next' : 'Save'}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

// Add this new component after the SaveDialog component
const GroupDialog = ({
  visible,
  onDismiss,
  onSave,
  existingGroups,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSave: (groupName: string, groupType: 'new' | 'existing') => void;
  existingGroups: Group[];
}) => {
  const [groupType, setGroupType] = useState<'new' | 'existing' | null>(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (visible) {
      setGroupType(null);
      setGroupName('');
    }
  }, [visible]);

  const handleDismiss = () => {
    setGroupType(null);
    setGroupName('');
    onDismiss();
  };

  const handleGroupSelect = (type: 'new' | 'existing') => {
    setGroupType(type);
    if (type === 'existing' && existingGroups.length === 0) {
      Alert.alert('No Groups', 'No existing groups found. Please create a new group.');
      return;
    }
  };

  return (
    <Dialog visible={visible} onDismiss={handleDismiss}>
      <Dialog.Title>Select Group</Dialog.Title>
      <Dialog.Content>
        {!groupType ? (
          <View style={styles.groupTypeButtons}>
            <Button
              mode="contained"
              onPress={() => handleGroupSelect('new')}
              style={styles.groupTypeButton}
            >
              New Group
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleGroupSelect('existing')}
              style={styles.groupTypeButton}
              disabled={existingGroups.length === 0}
            >
              Existing Group
            </Button>
          </View>
        ) : groupType === 'new' ? (
          <>
            <TextInput
              label="New Group Name"
              value={groupName}
              onChangeText={setGroupName}
              style={styles.input}
              mode="outlined"
              placeholder="Enter group name"
              error={!groupName.trim()}
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="done"
              enablesReturnKeyAutomatically={true}
            />
            <View style={styles.groupActionButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setGroupType(null);
                  setGroupName('');
                }}
                style={styles.groupActionButton}
              >
                Back
              </Button>
              <Button
                mode="contained"
                onPress={() => onSave(groupName, 'new')}
                style={styles.groupActionButton}
                disabled={!groupName.trim()}
              >
                Save
              </Button>
            </View>
          </>
        ) : (
          <>
            <View style={styles.existingGroupsList}>
              {existingGroups.map((group) => (
                <Button
                  key={group.id}
                  mode={groupName === group.name ? 'contained' : 'outlined'}
                  onPress={() => setGroupName(group.name)}
                  style={styles.existingGroupButton}
                >
                  {group.name}
                </Button>
              ))}
            </View>
            <View style={styles.groupActionButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setGroupType(null);
                  setGroupName('');
                }}
                style={styles.groupActionButton}
              >
                Back
              </Button>
              <Button
                mode="contained"
                onPress={() => onSave(groupName, 'existing')}
                style={styles.groupActionButton}
                disabled={!groupName}
              >
                Save
              </Button>
            </View>
          </>
        )}
      </Dialog.Content>
    </Dialog>
  );
};

export default function PreviewScreen() {
  const params = useLocalSearchParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [slideName, setSlideName] = useState('');
  const [imageError, setImageError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [initialSlideName, setInitialSlideName] = useState('');
  const [existingGroups, setExistingGroups] = useState<Group[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [slideSetId, setSlideSetId] = useState<string | null>(null);

  useEffect(() => {
    if (params.slides) {
      try {
        const parsedSlides = JSON.parse(params.slides as string);
        setSlides(parsedSlides);
      } catch (error) {
        console.error('Error parsing slides:', error);
      }
    }

    // Check if we're editing existing slides
    if (params.isEditing === 'true') {
      setIsEditing(true);
      setSlideSetId(params.slideSetId as string);
      setSlideName(params.slideName as string);
      setInitialSlideName(params.slideName as string);
    }
  }, [params.slides, params.isEditing, params.slideSetId, params.slideName]);

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

  // Check if form is dirty (only for slide name)
  useEffect(() => {
    const isDirty = slideName !== initialSlideName;
    setIsFormDirty(isDirty);
  }, [slideName, initialSlideName]);

  // Set initial values when component mounts
  useEffect(() => {
    setInitialSlideName(slideName);
  }, []);

  const handleSave = () => {
    if (isEditing) {
      handleUpdateExistingSlides();
    } else {
      setShowSaveDialog(true);
    }
  };

  const handleUpdateExistingSlides = async () => {
    try {
      const savedSlides = await AsyncStorage.getItem('singleSlides');
      if (savedSlides && slideSetId) {
        const allSlides = JSON.parse(savedSlides);
        const updatedSlides = allSlides.map((slideSet: SavedSlideSet) => {
          if (slideSet.id === slideSetId) {
            return {
              ...slideSet,
              content: slides
            };
          }
          return slideSet;
        });
        
        await AsyncStorage.setItem('singleSlides', JSON.stringify(updatedSlides));
        
        Alert.alert(
          'Success',
          'Slides updated successfully',
          [
            {
              text: 'OK',
              onPress: () => router.push({
                pathname: '/my-slides',
                params: { initialTab: 'single' }
              })
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating slides:', error);
      Alert.alert('Error', 'Failed to update slides. Please try again later.');
    }
  };

  const handleSaveConfirm = async (name: string, type: 'single' | 'grouped') => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (type === 'single') {
      try {
        const existingSlides = await AsyncStorage.getItem('singleSlides');
        const savedSlides = existingSlides ? JSON.parse(existingSlides) : [];
        
        // Save all slides as a single set
        const newSlideSet = {
          id: Date.now().toString(),
          name: name,
          content: slides, // Save all slides as an array
          createdAt: new Date().toISOString()
        };
        
        await AsyncStorage.setItem('singleSlides', JSON.stringify([...savedSlides, newSlideSet]));
        setShowSaveDialog(false);
        
        Alert.alert(
          'Success',
          'Slides saved successfully',
          [
            {
              text: 'OK',
              onPress: () => router.push({
                pathname: '/my-slides',
                params: { initialTab: 'single' }
              })
            }
          ]
        );
      } catch (error) {
        console.error('Error saving slides:', error);
        Alert.alert('Error', 'Failed to save slides. Please try again later.');
      }
    } else {
      // Store the slide name for later use
      setSlideName(name);
      setShowSaveDialog(false);
      setShowGroupDialog(true);
      try {
        const savedGroups = await AsyncStorage.getItem('slideGroups');
        if (savedGroups) {
          setExistingGroups(JSON.parse(savedGroups));
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    }
  };

  const handleGroupSave = async (groupName: string, groupType: 'new' | 'existing') => {
    try {
      const existingGroups = await AsyncStorage.getItem('slideGroups');
      const groups: Group[] = existingGroups ? JSON.parse(existingGroups) : [];
      
      // Create a new slide set with the name from the first dialog
      const newSlideSet = {
        id: Date.now().toString(),
        name: slideName, // Use the name from the first dialog
        content: slides, // Save all slides as an array
        createdAt: new Date().toISOString()
      };
      
      if (groupType === 'new') {
        // Create new group with the slide set
        const newGroup: Group = {
          id: Date.now().toString(),
          name: groupName,
          slides: [newSlideSet], // Save as an array with one slide set
          createdAt: new Date().toISOString()
        };
        
        await AsyncStorage.setItem('slideGroups', JSON.stringify([...groups, newGroup]));
      } else {
        // Add slide set to existing group
        const selectedGroup = groups.find((g: Group) => g.name === groupName);
        if (selectedGroup) {
          selectedGroup.slides.push(newSlideSet); // Add the slide set to the group
          await AsyncStorage.setItem('slideGroups', JSON.stringify(groups));
        }
      }
      
      setShowGroupDialog(false);
      setSlideName(''); // Reset the slide name
      
      Alert.alert(
        'Success',
        'Slides saved to group successfully',
        [
          {
            text: 'OK',
            onPress: () => router.push({
              pathname: '/my-slides',
              params: { initialTab: 'grouped' }
            })
          }
        ]
      );
    } catch (error) {
      console.error('Error saving to group:', error);
      Alert.alert('Error', 'Failed to save to group. Please try again later.');
    }
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
      params: { 
        slides: JSON.stringify(slides),
        isSingleSlide: 'false'
      }
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
        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Image</Text>
          {currentSlideData.image === 'No image selected' ? (
            <View style={styles.noImageContainer}>
              <IconButton icon="image-off" size={40} iconColor={MD3Colors.error50} />
              <Text style={styles.noContentText}>Image Not Provided</Text>
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
        </View>

        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Text Content</Text>
          <View style={styles.contentContainer}>
            {!currentSlideData.text ? (
              <View style={styles.noContentContainer}>
                <IconButton icon="text" size={40} iconColor={MD3Colors.error50} />
                <Text style={styles.noContentText}>Text Not Provided</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
              >
                <Text style={[
                  styles.slideText,
                  currentSlideData.style === 'bold' && styles.boldText,
                  currentSlideData.style === 'italic' && styles.italicText,
                ]}>
                  {currentSlideData.text}
                </Text>
                {currentSlideData.highlighted && (
                  <Text style={styles.highlightedText}>
                    Highlighted: {currentSlideData.highlighted}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Background Voice</Text>
          <View style={styles.contentContainer}>
            {!currentSlideData.backgroundVoice ? (
              <View style={styles.noContentContainer}>
                <IconButton icon="microphone-off" size={40} iconColor={MD3Colors.error50} />
                <Text style={styles.noContentText}>Voice Not Provided</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
              >
                <Text style={styles.ttsText}>
                  {currentSlideData.backgroundVoice}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <IconButton
          icon="page-first"
          onPress={() => setCurrentSlide(0)}
          disabled={currentSlide === 0}
        />
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
        <IconButton
          icon="page-last"
          onPress={() => setCurrentSlide(slides.length - 1)}
          disabled={currentSlide === slides.length - 1}
        />
      </View>

      <Portal>
        <SaveDialog
          visible={showSaveDialog}
          onDismiss={() => setShowSaveDialog(false)}
          onSave={handleSaveConfirm}
          initialSlideName=""
        />

        <GroupDialog
          visible={showGroupDialog}
          onDismiss={() => setShowGroupDialog(false)}
          onSave={handleGroupSave}
          existingGroups={existingGroups}
        />

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
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    color: MD3Colors.primary40,
    fontWeight: '500',
  },
  noContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
  },
  noContentText: {
    color: MD3Colors.error50,
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    width: width * 0.9,
    height: height * 0.3,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  noImageContainer: {
    width: width * 0.9,
    height: height * 0.3,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
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
  contentContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    minHeight: 100,
    maxHeight: height * 0.2,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  slideText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
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
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  saveButton: {
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  saveTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  saveTypeButton: {
    flex: 1,
  },
  groupTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  groupTypeButton: {
    flex: 1,
  },
  groupActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  groupActionButton: {
    flex: 1,
  },
  existingGroupsList: {
    gap: 8,
    marginBottom: 16,
  },
  existingGroupButton: {
    marginBottom: 8,
  },
  errorNote: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
  },
}); 