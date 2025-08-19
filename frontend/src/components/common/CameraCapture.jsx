import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button, Modal, InputNumber, message, Progress, Space, Switch, Radio } from 'antd';
import { CameraOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

const CameraCapture = forwardRef(({ 
  onCapture, 
  buttonText = "Chụp ảnh", 
  disabled = false, 
  autoMode = true,
  continuousMode = false,
  continuousInterval = 30,
  isAutoRunning = false,
  onClose,
  title,
  autoCaptureCount,
  hideButton = false
}, ref) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [timerDuration, setTimerDuration] = useState(3); // Mặc định 3 giây
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [autoCapture, setAutoCapture] = useState(autoMode);
  const [captureMode, setCaptureMode] = useState('single'); // 'single' or 'continuous'
  const [continuousIntervalState, setContinuousIntervalState] = useState(continuousInterval);
  const [isContinuousRunning, setIsContinuousRunning] = useState(false);
  const [continuousCount, setContinuousCount] = useState(0);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState(0);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const continuousTimerRef = useRef(null);
  const autoCaptureCountdownRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),
    startContinuousCapture: () => startContinuousCapture(),
    stopContinuousCapture: () => stopContinuousCapture()
  }));

  // Cleanup stream khi component unmount
  useEffect(() => {
    return () => {
      stopStream();
      stopContinuousCapture();
      if (autoCaptureCountdownRef.current) {
        clearInterval(autoCaptureCountdownRef.current);
      }
    };
  }, []);

  // Auto open modal when auto running is enabled
  useEffect(() => {
    if (isAutoRunning && !modalOpen) {
      handleModalOpen();
    } else if (!isAutoRunning && modalOpen) {
      handleModalClose();
    }
  }, [isAutoRunning, modalOpen]);

  // Auto start continuous capture when auto running is enabled
  useEffect(() => {
    if (isAutoRunning && isStreaming && !isContinuousRunning) {
      setCaptureMode('continuous');
      startContinuousCapture();
    } else if (!isAutoRunning && isContinuousRunning) {
      stopContinuousCapture();
    }
  }, [isAutoRunning, isStreaming]);

  // Sync continuousInterval prop with state
  useEffect(() => {
    console.log('🔄 Syncing continuousInterval prop:', continuousInterval, 'to state');
    setContinuousIntervalState(continuousInterval);
    
    // Update countdown if auto capture is running
    if (isAutoRunning && isContinuousRunning && autoCaptureCountdownRef.current) {
      setAutoCaptureCountdown(continuousInterval);
    }
  }, [continuousInterval, isAutoRunning, isContinuousRunning]);

  // Auto start continuous capture when modal opens in auto mode
  useEffect(() => {
    if (modalOpen && isAutoRunning && isStreaming && !isContinuousRunning) {
      // Wait longer for camera to fully stabilize, then start continuous capture
      const autoStartTimer = setTimeout(() => {
        console.log('Bắt đầu chụp tự động sau khi camera ổn định');
        setCaptureMode('continuous');
        startContinuousCapture();
      }, 3000); // Increased from 2000 to 3000ms
      
      return () => clearTimeout(autoStartTimer);
    }
  }, [modalOpen, isAutoRunning, isStreaming, isContinuousRunning]);

  // Auto start countdown when camera is ready in auto mode (single capture)
  useEffect(() => {
    if (isStreaming && autoCapture && !capturing && !capturedImage && captureMode === 'single' && !isAutoRunning) {
      // Wait a moment for camera to stabilize, then start countdown
      const autoStartTimer = setTimeout(() => {
        startCountdown();
      }, 1000);
      
      return () => clearTimeout(autoStartTimer);
    }
  }, [isStreaming, autoCapture, capturing, capturedImage, captureMode, isAutoRunning]);

  // Start continuous capture when mode is set to continuous
  useEffect(() => {
    if (isStreaming && captureMode === 'continuous' && !isContinuousRunning && !isAutoRunning) {
      startContinuousCapture();
    } else if (captureMode === 'single' && isContinuousRunning && !isAutoRunning) {
      stopContinuousCapture();
    }
  }, [isStreaming, captureMode, isContinuousRunning, isAutoRunning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'environment' // Sử dụng camera sau nếu có
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready before setting streaming to true
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata đã tải, kích thước:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        setIsStreaming(true);
        };
        
        videoRef.current.oncanplay = () => {
          console.log('Video có thể phát, sẵn sàng chụp');
        };
      }
    } catch (error) {
      message.error('Không thể truy cập camera: ' + error.message);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setCountdown(0);
    setCapturing(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopContinuousCapture();
  };

  const startContinuousCapture = () => {
    if (isContinuousRunning) return;
    
          console.log('Bắt đầu chụp liên tục - prop interval:', continuousInterval, 'state interval:', continuousIntervalState);
    
    setIsContinuousRunning(true);
    setContinuousCount(0);
    
    // Start countdown for auto capture mode
    if (isAutoRunning) {
      setAutoCaptureCountdown(continuousIntervalState);
      autoCaptureCountdownRef.current = setInterval(() => {
        setAutoCaptureCountdown(prev => {
          console.log('Đếm ngược chụp tự động:', prev);
          if (prev <= 1) {
            // Trigger capture immediately when countdown reaches 0
            console.log('Đếm ngược về 0, bắt đầu chụp!');
            capturePhoto();
            return continuousIntervalState; // Reset to full interval
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // For auto capture mode, countdown will trigger capture
    // For manual continuous mode, use setTimeout
    if (!isAutoRunning) {
      // Start the continuous capture cycle for manual mode
    const startCaptureCycle = () => {
      setContinuousCount(prev => prev + 1);
      capturePhoto();
      
        // Schedule next capture using the synchronized state
        continuousTimerRef.current = setTimeout(startCaptureCycle, continuousIntervalState * 1000);
    };
    
      // Start first capture after interval using the synchronized state
      continuousTimerRef.current = setTimeout(startCaptureCycle, continuousIntervalState * 1000);
    }
    
    if (!isAutoRunning) {
      message.success(`Bắt đầu chụp tự động mỗi ${continuousIntervalState} giây`);
    }
  };

  const stopContinuousCapture = () => {
    const wasRunning = isContinuousRunning;
    if (continuousTimerRef.current) {
      clearTimeout(continuousTimerRef.current);
      continuousTimerRef.current = null;
    }
    if (autoCaptureCountdownRef.current) {
      clearInterval(autoCaptureCountdownRef.current);
      autoCaptureCountdownRef.current = null;
    }
    setIsContinuousRunning(false);
    setAutoCaptureCountdown(0);
    if (!isAutoRunning && wasRunning) {
      message.info('Dừng chụp tự động');
    }
  };

  const startCountdown = () => {
    if (capturing) return;
    
    setCapturing(true);
    setCountdown(timerDuration);
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          capturePhoto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    console.log('capturePhoto được gọi - isAutoRunning:', isAutoRunning, 'isStreaming:', isStreaming);
    
    // Simple check - just make sure video and canvas exist
    if (!videoRef.current || !canvasRef.current) {
      console.log('Video hoặc canvas chưa sẵn sàng');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size to match video (use default if video not ready)
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, width, height);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `electric-meter-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedImage(URL.createObjectURL(blob));
        
        // Increment count for auto capture mode
        if (isAutoRunning) {
          setContinuousCount(prev => prev + 1);
        }
        
        // Call parent callback with the captured file
        if (onCapture) {
                  console.log('Gửi file ảnh đã chụp đến component cha');
        onCapture(file);
      } else {
        console.warn('onCapture callback không được cung cấp');
      }
        
        if (captureMode === 'continuous' || isAutoRunning) {
          if (!isAutoRunning) {
          message.success(`Chụp tự động lần ${continuousCount + 1} thành công!`);
          }
          // Don't show captured image in continuous mode to avoid UI clutter
          setCapturedImage(null);
        } else {
          message.success('Đã chụp ảnh thành công!');
        }
      } else {
        console.error('Không thể tạo blob từ canvas');
      }
    }, 'image/jpeg', 0.9);
    
    setCapturing(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleModalOpen = () => {
    setModalOpen(true);
    setCapturedImage(null);
    setContinuousCount(0);
    startCamera();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    stopStream();
    setCapturedImage(null);
    setContinuousCount(0);
    if (isAutoRunning && onClose) {
      onClose();
    }
  };

  const handleConfirm = () => {
    handleModalClose();
    if (isAutoRunning && onClose) {
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturing(false);
    setCountdown(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <>
      {!hideButton && (
        <Button 
          icon={<CameraOutlined />} 
          onClick={handleModalOpen}
          disabled={disabled}
          style={{ minWidth: 120 }}
        >
          {buttonText}
        </Button>
      )}

      <Modal
        open={modalOpen}
        onCancel={isAutoRunning ? onClose : handleModalClose}
        title={title || "Chụp ảnh"}
        closable={!isAutoRunning}
        footer={isAutoRunning ? [
          <Button key="stop" type="primary" danger onClick={onClose}>
            Dừng chụp tự động
          </Button>
        ] : [
          <Button key="cancel" onClick={handleModalClose}>
            Đóng
          </Button>,
          capturedImage && (
          <Button key="retake" onClick={handleRetake}>
            Chụp lại
            </Button>
          ),
          capturedImage && (
          <Button key="confirm" type="primary" onClick={handleConfirm}>
            Xác nhận
          </Button>
          )
        ]}
        width={900}
        destroyOnClose
      >
        {/* Auto Capture Status Display */}
        {isAutoRunning && autoCaptureCount !== undefined && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ 
              padding: 12, 
              background: '#f6ffed', 
              borderRadius: 6,
              color: '#52c41a',
              fontSize: 14,
              marginBottom: 16
            }}>
              Đang chụp tự động: Đã chụp {autoCaptureCount} lần - Lần tiếp theo sau {autoCaptureCountdown} giây
            </div>
            
            <div style={{ 
              padding: 8, 
              background: '#e6f7ff', 
              borderRadius: 4,
              color: '#1890ff',
              fontSize: 12
            }}>
              Camera sẽ tự động chụp mỗi {continuousIntervalState} giây. Đảm bảo camera hướng về công tơ điện.
            </div>
            
            {/* Countdown Display */}
            {autoCaptureCountdown > 0 && (
              <div style={{ 
                marginTop: 12,
                padding: 16, 
                background: '#fff2e8', 
                borderRadius: 8,
                border: '2px solid #ff7a45',
                color: '#d4380d',
                fontSize: 24,
                fontWeight: 'bold',
                display: 'inline-block',
                minWidth: 80
              }}>
                {autoCaptureCountdown}s
              </div>
            )}
          </div>
        )}

        {/* Settings Panel */}
        {!capturedImage && !isAutoRunning && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f6f6f6', borderRadius: 6 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>Chế độ chụp:</strong>
                  <Radio.Group 
                    value={captureMode} 
                    onChange={(e) => setCaptureMode(e.target.value)}
                    style={{ marginLeft: 16 }}
                  disabled={isAutoRunning}
                  >
                    <Radio.Button value="single">Chụp một lần</Radio.Button>
                    <Radio.Button value="continuous">Chụp liên tục</Radio.Button>
                  </Radio.Group>
                </div>
                
              {captureMode === 'single' && !isAutoRunning && (
                  <Space align="center" wrap>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Chế độ tự động:</span>
                      <Switch 
                        checked={autoCapture} 
                        onChange={setAutoCapture}
                        disabled={capturing}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ClockCircleOutlined />
                      <span>Thời gian đếm ngược:</span>
                      <InputNumber
                        min={1}
                        max={10}
                        value={timerDuration}
                        onChange={setTimerDuration}
                        disabled={capturing}
                        suffix="giây"
                        style={{ width: 100 }}
                      />
                    </div>
                    {!autoCapture && (
                      <Button 
                        type="primary" 
                        onClick={startCountdown}
                        disabled={!isStreaming || capturing}
                        loading={capturing}
                      >
                        {capturing ? 'Đang chụp...' : 'Bắt đầu chụp'}
                      </Button>
                    )}
                  </Space>
                )}
                
              {captureMode === 'continuous' && !isAutoRunning && (
                  <Space align="center" wrap>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Chụp mỗi:</span>
                      <InputNumber
                        min={5}
                        max={300}
                      value={continuousIntervalState}
                      onChange={setContinuousIntervalState}
                        disabled={isContinuousRunning}
                        suffix="giây"
                        style={{ width: 100 }}
                      />
                    </div>
                    <Button 
                      type={isContinuousRunning ? "default" : "primary"}
                      icon={isContinuousRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={isContinuousRunning ? stopContinuousCapture : startContinuousCapture}
                      disabled={!isStreaming}
                    >
                      {isContinuousRunning ? 'Dừng chụp' : 'Bắt đầu chụp liên tục'}
                    </Button>
                  </Space>
                )}
              </Space>
            </div>
          )}

          {/* Auto Mode Indicator */}
        {!capturedImage && autoCapture && isStreaming && !capturing && captureMode === 'single' && !isAutoRunning && (
            <div style={{ 
              marginBottom: 16, 
              padding: 8, 
              background: '#e6f7ff', 
              borderRadius: 6,
              color: '#1890ff',
              fontSize: 14
            }}>
              Chế độ tự động: Camera sẽ tự động chụp sau {timerDuration} giây...
            </div>
          )}

          {/* Continuous Mode Status */}
        {!capturedImage && (isContinuousRunning || isAutoRunning) && (captureMode === 'continuous' || isAutoRunning) && !isAutoRunning && (
            <div style={{ 
              marginBottom: 16, 
              padding: 8, 
              background: '#f6ffed', 
              borderRadius: 6,
              color: '#52c41a',
              fontSize: 14
            }}>
            Chụp liên tục: Đã chụp {continuousCount} lần - Lần tiếp theo sau {continuousIntervalState} giây
            </div>
          )}

          {/* Camera View */}
          {!capturedImage && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxWidth: 640,
                  height: 'auto',
                  border: '2px solid #d9d9d9',
                  borderRadius: 8,
                  background: '#000'
                }}
              />
             
             {/* Hidden canvas for capturing */}
             <canvas
               ref={canvasRef}
               style={{ display: 'none' }}
             />
              
              {/* Countdown Overlay */}
              {capturing && countdown > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: 20,
                  borderRadius: 50,
                  fontSize: 48,
                  fontWeight: 'bold',
                  minWidth: 100,
                  minHeight: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {countdown}
                </div>
              )}

              {/* Progress Ring */}
              {capturing && (
                <div style={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}>
                  <Progress
                    type="circle"
                    percent={((timerDuration - countdown) / timerDuration) * 100}
                    size={60}
                    format={() => 'Chụp'}
                  />
                </div>
              )}
            </div>
          )}

        {/* Captured Image */}
        {capturedImage && (
          <div style={{ textAlign: 'center' }}>
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                maxWidth: '100%',
                maxHeight: 400,
                border: '2px solid #d9d9d9',
                  borderRadius: 8
                }}
              />
            </div>
          )}
      </Modal>
    </>
  );
});

CameraCapture.displayName = 'CameraCapture';

export default CameraCapture; 