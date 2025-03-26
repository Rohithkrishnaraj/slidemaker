import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Image, Dimensions, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, IconButton, Portal, Dialog, MD3Colors } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slide } from '../utils/excelProcessor';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

type TextFormat = 'bold' | 'italic' | 'underline' | 'normal';
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'normal';

interface HighlightedWord {
  word: string;
  color: string;
}

const HIGHLIGHT_COLORS = [
  '#ffeb3b', // Yellow
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#000000', // Black
];

const HEADING_LABELS = {
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  normal: 'Normal'
};

export default function EditScreen() {
  const params = useLocalSearchParams();
  const [slideData, setSlideData] = useState<Slide>({
    id: '',
    image: '',
    text: '',
    highlighted: '',
    style: '',
    backgroundVoice: ''
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [highlightedWords, setHighlightedWords] = useState<HighlightedWord[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<TextFormat[]>([]);
  const [selectedHeading, setSelectedHeading] = useState<HeadingLevel>('normal');

  // Load initial data only once
  useEffect(() => {
    let mounted = true;

    const loadData = () => {
      if (params.slide) {
        try {
          const parsedSlide = JSON.parse(params.slide as string);
          if (mounted) {
            setSlideData(parsedSlide);
            // Parse highlighted words if they exist
            if (parsedSlide.highlighted) {
              const words = parsedSlide.highlighted.split(' ');
              setHighlightedWords(words.map((word: string, index: number) => ({
                word,
                color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length]
              })));
            }
            // Parse text formats
            if (parsedSlide.style) {
              const formats = parsedSlide.style.split(' ');
              setSelectedFormats(formats.filter((f: string) => 
                ['bold', 'italic', 'underline', 'normal'].includes(f)
              ) as TextFormat[]);
              const heading = formats.find((f: string) => 
                ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(f)
              ) as HeadingLevel || 'normal';
              setSelectedHeading(heading);
            }
          }
        } catch (error) {
          console.error('Error parsing slide data:', error);
        }
      }
      if (params.index && mounted) {
        setSlideIndex(parseInt(params.index as string));
      }
      if (params.totalSlides && mounted) {
        setTotalSlides(parseInt(params.totalSlides as string));
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = useCallback(() => {
    // Combine all styles
    const combinedStyle = [...selectedFormats, selectedHeading].join(' ');
    
    // Combine highlighted words
    const combinedHighlighted = highlightedWords.map(h => h.word).join(' ');
    
    const updatedSlideData = {
      ...slideData,
      style: combinedStyle,
      highlighted: combinedHighlighted
    };

    router.back();
    router.setParams({
      updatedSlide: JSON.stringify(updatedSlideData),
      index: slideIndex.toString()
    });
  }, [slideData, slideIndex, selectedFormats, selectedHeading, highlightedWords]);

  const handleTextChange = useCallback((text: string) => {
    setSlideData(prev => ({ ...prev, text }));
  }, []);

  const handleVoiceChange = useCallback((backgroundVoice: string) => {
    setSlideData(prev => ({ ...prev, backgroundVoice }));
  }, []);

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,

        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        // Copy the image to app's document directory
        const filename = result.assets[0].uri.split('/').pop();
        const destination = `${FileSystem.documentDirectory}${filename}`;
        
        await FileSystem.copyAsync({
          from: result.assets[0].uri,
          to: destination
        });

        setSlideData(prev => ({ ...prev, image: destination }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const toggleFormat = (format: TextFormat) => {
    setSelectedFormats(prev => {
      if (format === 'normal') {
        return ['normal'];
      }
      if (prev.includes(format)) {
        return prev.filter(f => f !== format);
      }
      return [...prev.filter(f => f !== 'normal'), format];
    });
  };

  const toggleHeading = (heading: HeadingLevel) => {
    setSelectedHeading(heading);
  };

  const addHighlightedWord = (word: string) => {
    if (!word.trim()) return;
    const newWord = {
      word: word.trim(),
      color: HIGHLIGHT_COLORS[highlightedWords.length % HIGHLIGHT_COLORS.length]
    };
    setHighlightedWords(prev => [...prev, newWord]);
    setSlideData(prev => ({
      ...prev,
      highlighted: prev.highlighted 
        ? `${prev.highlighted} ${newWord.word}`
        : newWord.word
    }));
  };

  const removeHighlightedWord = (index: number) => {
    setHighlightedWords(prev => {
      const newWords = prev.filter((_, i) => i !== index);
      const newHighlighted = newWords.map(w => w.word).join(' ');
      setSlideData(prevData => ({
        ...prevData,
        highlighted: newHighlighted
      }));
      return newWords;
    });
  };

  const updateHighlightColor = (index: number, color: string) => {
    setHighlightedWords(prev => {
      const newWords = prev.map((word, i) => 
        i === index ? { ...word, color } : word
      );
      return newWords;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="titleMedium">
            Editing Slide {slideIndex + 1} of {totalSlides}
          </Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Image</Text>
          {slideData.image ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: slideData.image }}
                style={styles.image}
                resizeMode="contain"
              />
              <View style={styles.imageActions}>
                <IconButton
                  icon="pencil"
                  size={24}
                  onPress={handleImagePick}
                  style={styles.imageButton}
                />
                <IconButton
                  icon="delete"
                  size={24}
                  onPress={() => setSlideData(prev => ({ ...prev, image: 'No image selected' }))}
                  style={styles.imageButton}
                />
              </View>
            </View>
          ) : (
            <Button
              mode="outlined"
              onPress={handleImagePick}
              style={styles.addImageButton}
              icon="image-plus"
            >
              Add Image
            </Button>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Text Content</Text>
          
          {/* Text Content */}
          <TextInput
            label="Add Text Here"
            value={slideData.text}
            onChangeText={handleTextChange}
            style={styles.input}
            multiline
          />

          {/* List of Highlighted Words */}
          <View style={styles.subsectionContainer}>
            <Text variant="titleSmall" style={styles.subsectionTitle}>Highlighted Words List</Text>
            <View style={styles.highlightedWordsList}>
              {highlightedWords.map((word, index) => (
                <View key={index} style={styles.highlightedWordItem}>
                  <View style={[styles.colorPreview, { backgroundColor: word.color }]} />
                  <Text style={[styles.highlightedWord, { color: word.color }]}>{word.word}</Text>
                  <View style={styles.colorButtons}>
                    {HIGHLIGHT_COLORS.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorButton, 
                          { backgroundColor: color },
                          word.color === color && styles.selectedColorButton
                        ]}
                        onPress={() => updateHighlightColor(index, color)}
                      />
                    ))}
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => removeHighlightedWord(index)}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Add Highlighted Word Input */}
          <View style={styles.subsectionContainer}>
            <Text variant="titleSmall" style={styles.subsectionTitle}>Add Highlighted Word</Text>
            <TextInput
              label="Enter word to highlight"
              onSubmitEditing={(e) => addHighlightedWord(e.nativeEvent.text)}
              style={styles.input}
            />
          </View>

          {/* Text Style */}
          <View style={styles.subsectionContainer}>
            <Text variant="titleSmall" style={styles.subsectionTitle}>Highlighted Text Style</Text>
            <Text style={styles.styleDescription}>Select style for highlighted words</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.headingPreviewContainer}
            >
              {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'normal'] as HeadingLevel[]).map(heading => (
                <TouchableOpacity
                  key={heading}
                  onPress={() => toggleHeading(heading)}
                  style={[
                    styles.headingPreviewButton,
                    selectedHeading === heading && styles.selectedHeadingPreview
                  ]}
                >
                  <View style={styles.headingPreviewContent}>
                    <Text style={[
                      styles.headingPreviewLabel,
                      { color: HIGHLIGHT_COLORS[6] }, // Using first highlight color for preview
                      heading === 'h1' && styles.h1Preview,
                      heading === 'h2' && styles.h2Preview,
                      heading === 'h3' && styles.h3Preview,
                      heading === 'h4' && styles.h4Preview,
                      heading === 'h5' && styles.h5Preview,
                      heading === 'h6' && styles.h6Preview,
                      heading === 'normal' && styles.normalPreview,
                    ]}>
                      T
                    </Text>
                    <Text style={styles.headingTypeLabel}>
                      {heading === 'normal' ? 'Normal' : heading.toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Text Format */}
          <View style={styles.subsectionContainer}>
            <Text variant="titleSmall" style={styles.subsectionTitle}>Highlighted Text Format</Text>
            <Text style={styles.styleDescription}>Additional formatting for highlighted words</Text>
            <View style={styles.formatButtons}>
              {(['bold', 'italic', 'underline', 'normal'] as TextFormat[]).map(format => (
                <Button
                  key={format}
                  mode={selectedFormats.includes(format) ? 'contained' : 'outlined'}
                  onPress={() => toggleFormat(format)}
                  style={styles.formatButton}
                  labelStyle={[
                    format === 'bold' && styles.boldPreview,
                    format === 'italic' && styles.italicPreview,
                    format === 'underline' && styles.underlinePreview,
                  ]}
                >
                  {format.charAt(0).toUpperCase() + format.slice(1)}
                </Button>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Background Voice</Text>
          <TextInput
            label="Text to Speech"
            value={slideData.backgroundVoice}
            onChangeText={handleVoiceChange}
            style={styles.input}
            multiline
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.footerButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.footerButton}
        >
          Save Changes
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionContainer: {
    marginBottom: 24,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    color: MD3Colors.primary40,
    fontWeight: '500',
  },
  subsectionContainer: {
    marginTop: 16,
  },
  subsectionTitle: {
    marginBottom: 8,
    color: MD3Colors.secondary40,
    fontWeight: '500',
  },
  imageContainer: {
    width: width * 0.9,
    height: width * 0.6,
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 4,
  },
  imageButton: {
    margin: 0,
  },
  addImageButton: {
    width: width * 0.9,
    height: width * 0.6,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  headingPreviewContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 12,
  },
  headingPreviewButton: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedHeadingPreview: {
    borderColor: MD3Colors.primary40,
    backgroundColor: '#e8e8e8',
  },
  headingPreviewContent: {
    alignItems: 'center',
    gap: 8,
  },
  headingPreviewLabel: {
    fontWeight: 'bold',
  },
  headingTypeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  h1Preview: {
    fontSize: 48,
  },
  h2Preview: {
    fontSize: 42,
  },
  h3Preview: {
    fontSize: 36,
  },
  h4Preview: {
    fontSize: 30,
  },
  h5Preview: {
    fontSize: 24,
  },
  h6Preview: {
    fontSize: 20,
  },
  normalPreview: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  formatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatButton: {
    flex: 1,
    minWidth: 80,
  },
  highlightedWordsList: {
    marginBottom: 16,
  },
  highlightedWordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  colorButtons: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
  },
  colorButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedColorButton: {
    borderWidth: 2,
    borderColor: '#000',
  },
  highlightedWord: {
    flex: 1,
    marginRight: 8,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  styleDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  boldPreview: {
    fontWeight: 'bold',
  },
  italicPreview: {
    fontStyle: 'italic',
  },
  underlinePreview: {
    textDecorationLine: 'underline',
  },
}); 