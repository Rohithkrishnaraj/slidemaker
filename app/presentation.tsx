import { useState, useEffect } from 'react';
import { StyleSheet, View, Image, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slide } from '../utils/excelProcessor';
import * as Speech from 'expo-speech';
import * as ScreenOrientation from 'expo-screen-orientation';
import React from 'react';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PresentationScreen() {
  const params = useLocalSearchParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  // Initialize and cleanup orientation handling
  useEffect(() => {
    const setupOrientation = async () => {
      // Allow all orientations for this screen
      await ScreenOrientation.unlockAsync();
      
      // Set up orientation change listener
      const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
        const isLandscapeOrientation = 
          orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
        setIsLandscape(isLandscapeOrientation);
        
        // Hide status bar in landscape
        StatusBar.setHidden(isLandscapeOrientation);
      });

      return () => {
        subscription.remove();
      };
    };

    setupOrientation();

    // Cleanup function
    return () => {
      const cleanup = async () => {
        // Reset orientation to portrait when leaving
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        StatusBar.setHidden(false);
        Speech.stop();
      };
      cleanup();
    };
  }, []);

  // Parse slides data
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
    const playVoice = async () => {
      await Speech.stop();
      
      const currentVoiceText = slides[currentSlide]?.backgroundVoice;
      if (currentVoiceText && !isVoiceMuted) {
        try {
          await Speech.speak(currentVoiceText);
        } catch (error) {
          console.error('Error playing voice:', error);
        }
      }
    };

    playVoice();
  }, [currentSlide, slides, isVoiceMuted]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentSlide(prev => {
          if (prev >= slides.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, slides.length]);

  const handlePrevious = async () => {
    await Speech.stop();
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const handleNext = async () => {
    await Speech.stop();
    setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
  };

  const handleFirst = async () => {
    await Speech.stop();
    setCurrentSlide(0);
  };

  const handleLast = async () => {
    await Speech.stop();
    setCurrentSlide(slides.length - 1);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const toggleVoice = async () => {
    const currentVoiceText = slides[currentSlide]?.backgroundVoice;
    if (!currentVoiceText) return;

    if (!isVoiceMuted) {
      await Speech.stop();
    } else {
      try {
        await Speech.speak(currentVoiceText);
      } catch (error) {
        console.error('Error playing voice:', error);
      }
    }
    setIsVoiceMuted(!isVoiceMuted);
  };

  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      }
    } catch (error) {
      console.error('Error changing orientation:', error);
    }
  };

  const currentSlideData = slides[currentSlide];

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim();
  };

  const renderStyledText = (text: string, highlightedWords: string | undefined, style: string | undefined, shouldTruncate: boolean) => {
    if (!text) return null;
    
    let displayText = shouldTruncate && !isTextExpanded ? truncateText(text, 100) : text;
    
    if (highlightedWords) {
      const words = highlightedWords.split(' ');
      let parts = displayText;
      
      // Replace each highlighted word with a styled version
      words.forEach(word => {
        if (word.trim()) {
          const regex = new RegExp(`(${word})`, 'gi');
          parts = parts.replace(regex, '|^|$1|^|');
        }
      });
      
      // Split by our marker and map to styled components
      const textParts = parts.split('|^|');

      return (
        <Text style={[
          styles.slideText,
          style === 'bold' && styles.boldText,
          style === 'italic' && styles.italicText,
        ]}>
          {textParts.map((part, index) => {
            const isHighlighted = words.some(word => part.toLowerCase() === word.toLowerCase());
            return isHighlighted ? (
              <Text key={index} style={styles.highlightedText}>
                {part}
              </Text>
            ) : part;
          })}
          {shouldTruncate && !isTextExpanded && text.length > 100 && (
            <Text style={styles.readMore}>{" "}...read more</Text>
          )}
        </Text>
      );
    }

    return (
      <Text style={[
        styles.slideText,
        style === 'bold' && styles.boldText,
        style === 'italic' && styles.italicText,
      ]}>
        {displayText}
        {shouldTruncate && !isTextExpanded && text.length > 100 && (
          <Text style={styles.readMore}>{" "}...read more</Text>
        )}
      </Text>
    );
  };

  if (!currentSlideData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>No slides available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasText = currentSlideData.text;
  const hasImage = currentSlideData.image && currentSlideData.image !== 'No image selected';

  return (
    <View style={[styles.container, isLandscape && styles.landscapeContainer]}>
      <TouchableOpacity 
        style={styles.fullScreen} 
        onPress={toggleControls}
        activeOpacity={1}
      >
        {hasImage ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: currentSlideData.image }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        ) : hasText && (
          <View style={styles.centerContent}>
            <View style={styles.centeredTextContainer}>
              <TouchableOpacity onPress={() => setIsTextExpanded(!isTextExpanded)}>
                {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style, true)}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {hasImage && hasText && (
          <View style={styles.textOverlay}>
            <TouchableOpacity onPress={() => setIsTextExpanded(!isTextExpanded)}>
              {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style, true)}
            </TouchableOpacity>
          </View>
        )}

        {showControls && (
          <View style={styles.controlsContainer}>
            <View style={[styles.topControls, isLandscape && styles.landscapeTopControls]}>
              <IconButton 
                icon={isLandscape ? "screen-rotation" : "screen-rotation-lock"}
                iconColor="white"
                size={28}
                onPress={toggleOrientation}
                style={styles.rotationButton}
              />
              <Text style={styles.slideCount}>
                {currentSlide + 1} / {slides.length}
              </Text>
              <IconButton 
                icon={isVoiceMuted ? "volume-off" : "volume-high"}
                iconColor="white"
                size={28}
                onPress={toggleVoice}
                style={styles.voiceButton}
              />
            </View>

            <View style={[styles.bottomControls, isLandscape && styles.landscapeBottomControls]}>
              <View style={styles.navigationButtons}>
                <IconButton
                  icon="page-first"
                  iconColor="white"
                  size={28}
                  onPress={handleFirst}
                  disabled={currentSlide === 0}
                />
                <IconButton
                  icon="skip-previous"
                  iconColor="white"
                  size={28}
                  onPress={handlePrevious}
                  disabled={currentSlide === 0}
                />
                <IconButton
                  icon={isPlaying ? "pause" : "play"}
                  iconColor="white"
                  size={32}
                  onPress={togglePlayPause}
                />
                <IconButton
                  icon="skip-next"
                  iconColor="white"
                  size={28}
                  onPress={handleNext}
                  disabled={currentSlide === slides.length - 1}
                />
                <IconButton
                  icon="page-last"
                  iconColor="white"
                  size={28}
                  onPress={handleLast}
                  disabled={currentSlide === slides.length - 1}
                />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  landscapeContainer: {
    paddingTop: 0,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredTextContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    maxWidth: '80%',
  },
  slideText: {
    color: 'white',
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 36,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  highlightedText: {
    color: '#ffeb3b',
    backgroundColor: 'rgba(255, 235, 59, 0.2)',
    borderRadius: 4,
    padding: 2,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 20,
  },
  landscapeTopControls: {
    paddingTop: 0,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 20,
    paddingBottom: 50,
  },
  landscapeBottomControls: {
    paddingBottom: 16,
    marginBottom: 8,
  },
  slideCount: {
    color: 'white',
    fontSize: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    paddingVertical: 4,
  },
  rotationButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  voiceButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  readMore: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  highlightedReadMore: {
    color: '#FFC107',
  },
}); 