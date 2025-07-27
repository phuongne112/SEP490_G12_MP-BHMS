import React, { useState, useRef, useEffect } from 'react';
import { Button, Modal, InputNumber, message, Progress, Space, Switch, Radio } from 'antd';
import { CameraOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

export default function CameraCapture({ onCapture, buttonText = "📷 Chụp ảnh", disabled = false, autoMode = true }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [timerDuration, setTimerDuration] = useState(3); // Mặc định 3 giây
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [autoCapture, setAutoCapture] = useState(autoMode);
  const [captureMode, setCaptureMode] = useState('single'); // 'single' or 'continuous'
  const [continuousInterval, setContinuousInterval] = useState(30); // 30 seconds
  const [isContinuousRunning, setIsContinuousRunning] = useState(false);
  const [continuousCount, setContinuousCount] = useState(0);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const continuousTimerRef = useRef(null);

  // Cleanup stream khi component unmount
  useEffect(() => {
    return () => {
      stopStream();
      stopContinuousCapture();
    };
  }, []);

  // Auto start countdown when camera is ready in auto mode (single capture)
  useEffect(() => {
    if (isStreaming && autoCapture && !capturing && !capturedImage && captureMode === 'single') {
      // Wait a moment for camera to stabilize, then start countdown
      const autoStartTimer = setTimeout(() => {
        startCountdown();
      }, 1000);
      
      return () => clearTimeout(autoStartTimer);
    }
  }, [isStreaming, autoCapture, capturing, capturedImage, captureMode]);

  // Start continuous capture when mode is set to continuous
  useEffect(() => {
    if (isStreaming && captureMode === 'continuous' && !isContinuousRunning) {
      startContinuousCapture();
    } else if (captureMode === 'single' && isContinuousRunning) {
      stopContinuousCapture();
    }
  }, [isStreaming, captureMode, isContinuousRunning]);

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
        setIsStreaming(true);
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
    
    setIsContinuousRunning(true);
    setContinuousCount(0);
    
    // Start the continuous capture cycle
    const startCaptureCycle = () => {
      setContinuousCount(prev => prev + 1);
      capturePhoto();
      
      // Schedule next capture
      continuousTimerRef.current = setTimeout(startCaptureCycle, continuousInterval * 1000);
    };
    
    // Start first capture after interval
    continuousTimerRef.current = setTimeout(startCaptureCycle, continuousInterval * 1000);
    
    message.success(`🤖 Bắt đầu chụp tự động mỗi ${continuousInterval} giây`);
  };

  const stopContinuousCapture = () => {
    if (continuousTimerRef.current) {
      clearTimeout(continuousTimerRef.current);
      continuousTimerRef.current = null;
    }
    setIsContinuousRunning(false);
    message.info('⏹️ Dừng chụp tự động');
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
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `electric-meter-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedImage(URL.createObjectURL(blob));
        
        // Call parent callback with the captured file
        if (onCapture) {
          onCapture(file);
        }
        
        if (captureMode === 'continuous') {
          message.success(`📷 Chụp tự động lần ${continuousCount + 1} thành công!`);
          // Don't show captured image in continuous mode to avoid UI clutter
          setCapturedImage(null);
        } else {
          message.success('Đã chụp ảnh thành công!');
        }
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
  };

  const handleConfirm = () => {
    handleModalClose();
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
      <Button 
        icon={<CameraOutlined />} 
        onClick={handleModalOpen}
        disabled={disabled}
        size="small"
      >
        {buttonText}
      </Button>

      <Modal
        open={modalOpen}
        onCancel={handleModalClose}
        title="📷 Chụp ảnh công tơ điện"
        width={800}
        footer={capturedImage && captureMode === 'single' ? [
          <Button key="retake" onClick={handleRetake}>
            Chụp lại
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirm}>
            Xác nhận
          </Button>
        ] : null}
      >
        <div style={{ textAlign: 'center' }}>
          {/* Capture Mode Selection */}
          {!capturedImage && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f6f6f6', borderRadius: 6 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>Chế độ chụp:</strong>
                  <Radio.Group 
                    value={captureMode} 
                    onChange={(e) => setCaptureMode(e.target.value)}
                    style={{ marginLeft: 16 }}
                  >
                    <Radio.Button value="single">Chụp một lần</Radio.Button>
                    <Radio.Button value="continuous">Chụp liên tục</Radio.Button>
                  </Radio.Group>
                </div>
                
                {captureMode === 'single' && (
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
                
                {captureMode === 'continuous' && (
                  <Space align="center" wrap>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Chụp mỗi:</span>
                      <InputNumber
                        min={5}
                        max={300}
                        value={continuousInterval}
                        onChange={setContinuousInterval}
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
          {!capturedImage && autoCapture && isStreaming && !capturing && captureMode === 'single' && (
            <div style={{ 
              marginBottom: 16, 
              padding: 8, 
              background: '#e6f7ff', 
              borderRadius: 6,
              color: '#1890ff',
              fontSize: 14
            }}>
              🤖 Chế độ tự động: Camera sẽ tự động chụp sau {timerDuration} giây...
            </div>
          )}

          {/* Continuous Mode Status */}
          {!capturedImage && isContinuousRunning && captureMode === 'continuous' && (
            <div style={{ 
              marginBottom: 16, 
              padding: 8, 
              background: '#f6ffed', 
              borderRadius: 6,
              color: '#52c41a',
              fontSize: 14
            }}>
              🔄 Chụp liên tục: Đã chụp {continuousCount} lần - Lần tiếp theo sau {continuousInterval} giây
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
                    format={() => '📷'}
                  />
                </div>
              )}
            </div>
          )}

          {/* Captured Image Preview - Only show for single mode */}
          {capturedImage && captureMode === 'single' && (
            <div>
              <div style={{ color: '#52c41a', marginBottom: 16, fontSize: 16 }}>
                <CheckOutlined /> Đã chụp thành công!
              </div>
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                  width: '100%',
                  maxWidth: 640,
                  height: 'auto',
                  border: '2px solid #52c41a',
                  borderRadius: 8
                }}
              />
            </div>
          )}

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </Modal>
    </>
  );
} 