import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RenterVnPayReturnPage() {
  const navigate = useNavigate();
  useEffect(() => {
    // Thử đóng tab, nếu không được thì redirect về homepage sau 2 giây
    window.close();
    const timer = setTimeout(() => {
      navigate('/');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);
  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <h2>Thanh toán thành công!</h2>
      <p>Bạn sẽ được chuyển về trang chủ hoặc có thể đóng cửa sổ này.</p>
      <button onClick={() => { window.close(); navigate('/'); }}>Đóng cửa sổ</button>
    </div>
  );
} 