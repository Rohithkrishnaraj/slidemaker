import { useState, useEffect } from 'react';
import { View, Image, Dimensions, TouchableOpacity, StatusBar, ScrollView, TextStyle, ViewStyle } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slide } from '../utils/excelProcessor';
import * as Speech from 'expo-speech';
import * as ScreenOrientation from 'expo-screen-orientation';
import React from 'react';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Add highlight colors constant
const HIGHLIGHT_COLORS = [
  '#ffeb3b', // Yellow
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
];

export default function PresentationScreen() {
  const params = useLocalSearchParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(true);

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
        // Set text expanded mode to true by default in landscape
        if (isLandscapeOrientation) {
          setIsTextExpanded(true);
        }
        
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
        // Ensure we have an array of slides
        const slidesArray = Array.isArray(parsedSlides) ? parsedSlides : [parsedSlides];
        setSlides(slidesArray);
        // Start playing if it's a group presentation
        if (params.isSingleSlide === 'false') {
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error parsing slides:', error);
      }
    }
  }, [params.slides, params.isSingleSlide]);

  // Handle TTS and autoplay together
  useEffect(() => {
    const playVoice = async () => {
      await Speech.stop();
      
      const currentVoiceText = slides[currentSlide]?.backgroundVoice;
      if (currentVoiceText && !isVoiceMuted) {
        try {
          setIsSpeaking(true);
          await Speech.speak(currentVoiceText, {
            volume: 0.0,
            onDone: () => {
              setIsSpeaking(false);
              // Move to next slide after TTS completes and wait 2 seconds
              if (isPlaying) {
                setTimeout(() => {
                  if (isPlaying) {
                    setCurrentSlide(prev => {
                      if (prev >= slides.length - 1) {
                        setIsPlaying(false);
                        return prev;
                      }
                      return prev + 1;
                    });
                  }
                }, 2000);
              }
            },
            onError: () => {
              setIsSpeaking(false);
              // If TTS fails, still move to next slide after 2 seconds
              if (isPlaying) {
                setTimeout(() => {
                  if (isPlaying) {
                    setCurrentSlide(prev => {
                      if (prev >= slides.length - 1) {
                        setIsPlaying(false);
                        return prev;
                      }
                      return prev + 1;
                    });
                  }
                }, 2000);
              }
            }
          });
        } catch (error) {
          console.error('Error playing voice:', error);
          setIsSpeaking(false);
          // If TTS fails, still move to next slide after 2 seconds
          if (isPlaying) {
            setTimeout(() => {
              if (isPlaying) {
                setCurrentSlide(prev => {
                  if (prev >= slides.length - 1) {
                    setIsPlaying(false);
                    return prev;
                  }
                  return prev + 1;
                });
              }
            }, 2000);
          }
        }
      } else if (isPlaying) {
        // If no TTS or muted, move to next slide after 2 seconds
        setTimeout(() => {
          if (isPlaying) {
            setCurrentSlide(prev => {
              if (prev >= slides.length - 1) {
                setIsPlaying(false);
                return prev;
              }
              return prev + 1;
            });
          }
        }, 2000);
      }
    };

    playVoice();
  }, [currentSlide, slides, isVoiceMuted, isPlaying]);

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
      setIsSpeaking(false);
    } else {
      try {
        setIsSpeaking(true);
        await Speech.speak(currentVoiceText, {
          volume: 0.0,
          onDone: () => {
            setIsSpeaking(false);
          },
          onError: () => {
            setIsSpeaking(false);
          }
        });
      } catch (error) {
        console.error('Error playing voice:', error);
        setIsSpeaking(false);
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

  const getTextStyles = (highlightWord: { word: string; color: string; styles: string[] }): TextStyle[] => {
    const styles: TextStyle[] = [
      { color: highlightWord.color },
      // Apply heading styles
      highlightWord.styles.includes('h1') && { 
        fontSize: 40,
        fontWeight: 'bold',
        lineHeight: 60,
        paddingTop: 20,
        paddingBottom: 12,
        marginVertical: 8,
        includeFontPadding: false,
        textAlignVertical: 'center',
        alignSelf: 'center'
      },
      highlightWord.styles.includes('h2') && { 
        fontSize: 36,
        fontWeight: 'bold',
        lineHeight: 54,
        paddingTop: 16,
        paddingBottom: 10,
        marginVertical: 6,
        includeFontPadding: false,
        textAlignVertical: 'center',
        alignSelf: 'center'
      },
      highlightWord.styles.includes('h3') && { 
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 44,
        paddingVertical: 8,
        marginVertical: 6,
        includeFontPadding: false
      },
      highlightWord.styles.includes('h4') && { 
        fontSize: 28,
        fontWeight: 'bold',
        lineHeight: 40,
        paddingVertical: 8,
        marginVertical: 4,
        includeFontPadding: false
      },
      highlightWord.styles.includes('h5') && { 
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 36,
        paddingVertical: 6,
        marginVertical: 4,
        includeFontPadding: false
      },
      highlightWord.styles.includes('h6') && { 
        fontSize: 20,
        fontWeight: 'bold',
        lineHeight: 32,
        paddingVertical: 6,
        marginVertical: 4,
        includeFontPadding: false
      },
      // Apply format styles
      highlightWord.styles.includes('bold') && { fontWeight: 'bold' as const },
      highlightWord.styles.includes('italic') && { fontStyle: 'italic' as const },
      highlightWord.styles.includes('underline') && { textDecorationLine: 'underline' as const }
    ].filter(Boolean) as TextStyle[];

    return styles;
  };

  const renderStyledText = (text: string, highlighted: string, style: string) => {
    if (!text) return null;

    const displayText = !isTextExpanded ? truncateText(text, 100) : text;
    const textLines = displayText.split('\n').length;
    const isShortText = textLines <= 2;

    const highlightedWords = highlighted ? highlighted.split(' ').map((word, index) => ({
      word: word.trim(),
      color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
      styles: style ? style.split(' ') : []
    })).filter(w => w.word) : [];

    const pattern = highlightedWords.length > 0 
      ? new RegExp(`(${highlightedWords.map(h => h.word).join('|')})`, 'gi')
      : null;

    const baseTextStyle = { 
      color: '#fff', 
      fontSize: 24, 
      textAlign: isLandscape && isShortText ? 'center' : 'justify',
      lineHeight: 36, 
      includeFontPadding: false, 
      textAlignVertical: 'center' as const,
      paddingTop: 28 
    } as const;

    if (!pattern) {
      return (
        <Text style={baseTextStyle}>
          {displayText}
          {!isTextExpanded && text.length > 100 && (
            <Text style={{ 
              color: '#2196F3', 
              fontSize: 16, 
              fontWeight: 'bold', 
              marginLeft: 4, 
              textDecorationLine: 'underline', 
              opacity: 0.8, 
              backgroundColor: 'rgba(0, 0, 0, 0.3)', 
              paddingHorizontal: 8, 
              paddingVertical: 4, 
              borderRadius: 4, 
              marginTop: 8 
            }}>
              {" "}...read more
            </Text>
          )}
        </Text>
      );
    }

    const parts = displayText.split(pattern);

    return (
      <Text style={baseTextStyle}>
        {parts.map((part, index) => {
          const highlightWord = highlightedWords.find(h => 
            h.word.toLowerCase() === part.toLowerCase()
          );

          if (highlightWord) {
            return (
              <Text 
                key={index}
                style={getTextStyles(highlightWord)}
              >
                {part}
              </Text>
            );
          }
          return part;
        })}
        {!isTextExpanded && text.length > 100 && (
          <Text style={{ 
            color: '#2196F3', 
            fontSize: 16, 
            fontWeight: 'bold', 
            marginLeft: 4, 
            textDecorationLine: 'underline', 
            opacity: 0.8, 
            backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 4, 
            marginTop: 8 
          }}>
            {" "}...read more
          </Text>
        )}
      </Text>
    );
  };

  // Update the text expansion toggle to not affect autoplay
  const toggleTextExpansion = () => {
    setIsTextExpanded(!isTextExpanded);
  };

  if (!currentSlideData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>No slides available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasText = currentSlideData.text;
  const hasImage = currentSlideData.image && 
    currentSlideData.image !== 'No image selected' && 
    currentSlideData.image.trim() !== '';

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#000',
      ...(isLandscape && { flexDirection: 'row' })
    }}>
      <TouchableOpacity 
        style={{ 
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          width: '100%',
          height: '100%'
        }} 
        onPress={toggleControls}
        activeOpacity={1}
      >
        <View style={{ 
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 80
        }}>
          {hasImage && !isTextExpanded && (
            <Image
              source={{ uri: currentSlideData.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          )}
          {hasText && (
            <View style={{ 
              position: 'absolute',
              bottom: hasImage ? 80 : 0,
              left: 0,
              right: 0,
              top: !hasImage ? 0 : undefined,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 20,
              paddingTop: 70,
              ...(isTextExpanded && {
                top: 60,
                bottom: 60,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                paddingTop: 20,
                paddingBottom: 20
              }),
              ...(isLandscape && isTextExpanded && {
                paddingTop: 0,
                paddingBottom: 0
              })
            }}>
              {isLandscape && isTextExpanded ? (
                <View style={{ 
                  flexDirection: 'row',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0
                }}>
                  {hasImage && (
                    <View style={{ 
                      width: '50%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Image
                        source={{ uri: currentSlideData.image }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <View style={{ 
                    width: hasImage ? '50%' : '80%',
                    maxWidth: !hasImage ? 800 : undefined,
                    height: '100%',
                    backgroundColor: isLandscape && !isTextExpanded ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                    paddingHorizontal: 24,
                    paddingVertical: 20,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <ScrollView 
                      contentContainerStyle={{ 
                        flexGrow: 1,
                        justifyContent: 'center',
                        alignItems: hasImage ? 'flex-start' : 'center',
                        width: '100%'
                      }}
                    >
                      <TouchableOpacity onPress={toggleTextExpansion}>
                        {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style)}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              ) : isTextExpanded ? (
                <View style={{ 
                  flex: 1,
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: hasImage ? 'flex-start' : 'center',
                  ...(hasImage ? {} : { paddingTop: 60, paddingBottom: 60 })
                }}>
                  {hasImage && (
                    <View style={{ 
                      width: '100%',
                      height: '40%',
                      backgroundColor: '#000',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Image
                        source={{ uri: currentSlideData.image }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <View style={{ 
                    width: hasImage ? '90%' : '80%',
                    maxWidth: 800,
                    flex: 1,
                    marginTop: hasImage ? 70 : 0,
                    marginBottom: 20,
                    paddingHorizontal: 24,
                    paddingTop: 70,
                    paddingBottom: 32,
                    backgroundColor: isLandscape ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 12,
                    ...(!hasImage && {
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: 0,
                      marginBottom: 0
                    })
                  }}>
                    <ScrollView contentContainerStyle={{ 
                      flexGrow: 1,
                      ...(hasImage ? {} : {
                        justifyContent: 'center',
                        alignItems: 'center'
                      })
                    }}>
                      <TouchableOpacity onPress={toggleTextExpansion}>
                        {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style)}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              ) : (
                <View style={{ 
                  width: '100%',
                  maxWidth: 800,
                  minHeight: 150,
                  backgroundColor: isLandscape && !isTextExpanded ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingTop: 70,
                  paddingBottom: 32,
                  ...(hasImage ? {
                    marginTop: 48,
                    marginBottom: 20
                  } : {
                    position: 'absolute',
                    top: '50%',
                    transform: [{ translateY: -75 }],
                    marginTop: 0,
                    marginBottom: 0
                  })
                }}>
                  <TouchableOpacity onPress={toggleTextExpansion}>
                    {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style)}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {showControls && (
          <View style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10
          }}>
            <View style={{ 
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
              ...(isLandscape && { paddingTop: 0 })
            }}>
              <IconButton 
                icon={isLandscape ? "screen-rotation" : "screen-rotation-lock"}
                iconColor="white"
                size={28}
                onPress={toggleOrientation}
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              />
              <Text style={{ color: 'white', fontSize: 16 }}>
                {currentSlide + 1} / {slides.length}
              </Text>
              <IconButton 
                icon={isVoiceMuted ? "volume-off" : "volume-high"}
                iconColor="white"
                size={28}
                onPress={toggleVoice}
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              />
            </View>

            <View style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 20,
              paddingBottom: isLandscape ? 16 : 50,
              ...(isLandscape && { marginBottom: 8 })
            }}>
              <View style={{ 
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                gap: 8,
                paddingVertical: 4
              }}>
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