import React, { useState, useRef, useEffect } from 'react';
import { Button, Modal, Typography, Spin, message } from 'antd';
import { RotateRightOutlined, CloseOutlined, PauseOutlined, PlayCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const Image360Viewer = ({ images, visible, onClose, roomNumber }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState(0);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [dragVelocity, setDragVelocity] = useState(0);
  
  const dragStartX = useRef(0);
  const lastDragTime = useRef(0);
  const lastDragX = useRef(0);
  const containerRef = useRef(null);
  const autoRotateInterval = useRef(null);
  const momentumInterval = useRef(null);
  const sensitivity = 3; // FB-like sensitivity

  // Auto-start rotation when viewer opens (like FB)
  useEffect(() => {
    if (visible && !loading && !imageLoadError && images?.length > 0) {
      setTimeout(() => {
        startAutoRotation();
      }, 500); // Small delay like FB
    }
    
    return () => {
      stopAutoRotation();
      stopMomentum();
    };
  }, [visible, loading, imageLoadError, images?.length]);

  // Preload all images with better error handling
  useEffect(() => {
    if (visible && images?.length > 0) {
      setLoading(true);
      setLoadedImages(0);
      setImageLoadError(false);
      
      let successCount = 0;
      let errorCount = 0;
      
      images.forEach((imgSrc, index) => {
        const image = new Image();
        
        image.onload = () => {
          successCount++;
          setLoadedImages(successCount);
          if (successCount + errorCount === images.length) {
            if (successCount > 0) {
              setLoading(false);
            } else {
              setImageLoadError(true);
              setLoading(false);
            }
          }
        };
        
        image.onerror = () => {
          errorCount++;
          console.warn(`Failed to load image ${index}:`, imgSrc);
          if (successCount + errorCount === images.length) {
            if (successCount > 0) {
              setLoading(false);
            } else {
              setImageLoadError(true);
              setLoading(false);
              message.error('Không thể tải ảnh 360°');
            }
          }
        };
        
        image.src = imgSrc;
      });
    }
  }, [visible, images]);

  const startAutoRotation = () => {
    if (autoRotateInterval.current) return;
    setIsAutoRotating(true);
    
    autoRotateInterval.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 150); // FB-like speed
  };

  const stopAutoRotation = () => {
    if (autoRotateInterval.current) {
      clearInterval(autoRotateInterval.current);
      autoRotateInterval.current = null;
    }
    setIsAutoRotating(false);
  };

  const stopMomentum = () => {
    if (momentumInterval.current) {
      clearInterval(momentumInterval.current);
      momentumInterval.current = null;
    }
    setDragVelocity(0);
  };

  const applyMomentum = (velocity) => {
    if (Math.abs(velocity) < 0.1) return;
    
    stopMomentum();
    setDragVelocity(velocity);
    
    momentumInterval.current = setInterval(() => {
      setDragVelocity(prev => {
        const newVelocity = prev * 0.95; // Friction
        if (Math.abs(newVelocity) < 0.1) {
          stopMomentum();
          return 0;
        }
        
        if (Math.abs(newVelocity) > 0.5) {
          setCurrentIndex(prevIndex => {
            const direction = newVelocity > 0 ? 1 : -1;
            return (prevIndex + direction + images.length) % images.length;
          });
        }
        
        return newVelocity;
      });
    }, 50);
  };

  const handleMouseDown = (e) => {
    if (loading || imageLoadError) return;
    stopAutoRotation();
    stopMomentum();
    
    setIsDragging(true);
    dragStartX.current = e.clientX;
    lastDragTime.current = Date.now();
    lastDragX.current = e.clientX;
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || loading || imageLoadError) return;

    const currentTime = Date.now();
    const deltaX = e.clientX - dragStartX.current;
    const timeDelta = currentTime - lastDragTime.current;
    
    // Calculate velocity for momentum
    if (timeDelta > 0) {
      const velocity = (e.clientX - lastDragX.current) / timeDelta;
      setDragVelocity(velocity);
    }
    
    const movement = Math.floor(Math.abs(deltaX) / sensitivity);
    
    if (movement > 0) {
      const direction = deltaX > 0 ? 1 : -1;
      const newIndex = (currentIndex + direction * movement + images.length) % images.length;
      setCurrentIndex(newIndex);
      dragStartX.current = e.clientX;
    }
    
    lastDragTime.current = currentTime;
    lastDragX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Apply momentum effect
    setTimeout(() => {
      applyMomentum(dragVelocity);
    }, 10);
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    if (loading || imageLoadError) return;
    stopAutoRotation();
    stopMomentum();
    
    setIsDragging(true);
    dragStartX.current = e.touches[0].clientX;
    lastDragTime.current = Date.now();
    lastDragX.current = e.touches[0].clientX;
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!isDragging || loading || imageLoadError) return;

    const currentTime = Date.now();
    const deltaX = e.touches[0].clientX - dragStartX.current;
    const timeDelta = currentTime - lastDragTime.current;
    
    if (timeDelta > 0) {
      const velocity = (e.touches[0].clientX - lastDragX.current) / timeDelta;
      setDragVelocity(velocity);
    }
    
    const movement = Math.floor(Math.abs(deltaX) / sensitivity);
    
    if (movement > 0) {
      const direction = deltaX > 0 ? 1 : -1;
      const newIndex = (currentIndex + direction * movement + images.length) % images.length;
      setCurrentIndex(newIndex);
      dragStartX.current = e.touches[0].clientX;
    }
    
    lastDragTime.current = currentTime;
    lastDragX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    setTimeout(() => {
      applyMomentum(dragVelocity);
    }, 10);
  };

  const toggleAutoRotation = () => {
    if (isAutoRotating) {
      stopAutoRotation();
    } else {
      startAutoRotation();
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, currentIndex, loading, images?.length, dragVelocity]);

  if (!visible) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="95vw"
      style={{ top: 10 }}
      className="image-360-modal"
      destroyOnClose
    >
      <div style={{ 
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', 
        borderRadius: 12, 
        overflow: 'hidden',
        position: 'relative',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          color: 'white',
          padding: '20px 24px',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'white', margin: 0, fontSize: 20 }}>Xem phòng</h3>
              <Text style={{ color: '#ccc', fontSize: 14 }}>
                {imageLoadError ? 'Lỗi tải ảnh' :
                 loading ? `Đang tải ảnh... ${loadedImages}/${images?.length}` :
                 isAutoRotating ? 'Đang tự động xoay...' :
                 isDragging ? 'Đang kéo...' :
                 dragVelocity !== 0 ? 'Đà quay...' : ''}
              </Text>
            </div>
            <div />
          </div>
        </div>

        {/* Image Container */}
        <div 
          ref={containerRef}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : (loading || imageLoadError ? 'default' : 'grab'),
            userSelect: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: 20, 
                padding: '40px',
                backdropFilter: 'blur(10px)' 
              }}>
                <Spin size="large" />
                <div style={{ marginTop: 20, fontSize: 18 }}>
                  Đang tải ảnh 360°...
                </div>
                <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
                  ({loadedImages}/{images?.length})
                </div>
              </div>
            </div>
          ) : imageLoadError ? (
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: 20, 
                padding: '40px',
                backdropFilter: 'blur(10px)' 
              }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>📷</div>
                <div style={{ fontSize: 20, marginBottom: 8 }}>Không thể tải ảnh 360°</div>
                <div style={{ fontSize: 14, color: '#ccc' }}>Vui lòng thử lại sau</div>
              </div>
            </div>
          ) : (
            <img
              src={images[currentIndex]}
              alt={`360 view ${currentIndex}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: 'none',
                borderRadius: 8,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              draggable={false}
              onError={(e) => {
                console.error('Image failed to load:', e.target.src);
              }}
            />
          )}
        </div>

        {/* Bottom controls removed */}


      </div>
    </Modal>
  );
};

export default Image360Viewer; 