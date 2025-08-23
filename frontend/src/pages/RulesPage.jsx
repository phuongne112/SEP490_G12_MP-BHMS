import React from "react";
import { Button, Typography, Card } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

const { Title, Paragraph } = Typography;

export default function RulesPage() {
  const navigate = useNavigate();
  const rules = [
    "Mỗi phòng chỉ được ở số sinh viên theo hợp đồng, không được cho khách ở lại qua đêm (nếu có người nhà phải xin phép quản lý nhà trọ). Sau 22h giờ đêm không ra, vào khu nhà trọ.",
    "Đổ rác đúng quy định, ngăn nắp, sạch sẽ trong phòng ở, giữ gìn vệ sinh chung nơi công cộng. Không rửa thực phẩm trong chậu rửa mặt, nghiêm cấm đổ rác, và các vật cứng vào bồn cầu, rác trong nhà tắm phải quét rọn, không cho chảy vào lỗ thoát nước (Nếu tắc, phòng dọ phải tự thông hoặc chịu tiền thông tắc, sửa chữa nếu do lỗi người dùng vào bồn cầu). Toilet phải dùng giấy vệ sinh mềm, dùng xong cho vào thùng rác, không cho vào bồn cầu (gây tắc).",
    "Không được vẽ bậy, dán giấy, tranh ảnh trên tường nhà. Sinh viên nào vi phạm phải chịu trách nhiệm sửa lại.",
    "Tự quản lý tài sản cá nhân; không được cho người thân hoặc người lạ ở lại bất kỳ thời điểm nào. Sử dụng điện hợp lý tiết kiệm, tắt điện, thiết bị điện, thiết bị nước khi ra khỏi phòng ở.",
    "Hạn chế tối đa việc tiếp khách, không mời bạn bè đến quán uống nước gây mất an ninh và văn minh khu nhà trọ.",
    "Ban đêm, mọi người qua giờ phải đi nhẹ chân để tránh làm ảnh hưởng đến người khác.",
    "Bảo quản, giữ gìn và không thay đổi, xê dịch tài sản của phòng ở. Nếu làm hỏng, mất phải sửa chữa hoặc đền tiền theo giá thị trường.",
    "Sử dụng internet đúng quy định, không tự ý thay đổi mật khẩu wifi của nhà trọ.",
    "Cấm sử dụng, tàng trữ, mua bán các chất ma túy, gây nghiện, cồn nồng độ, chất cháy, chất độc hại, vũ khí, hung khí.",
    "Để xe ngăn nắp đúng nơi quy định, không được để đồ dùng khác tùy tiện khác trước lan can.",
    "Không chơi bóng, la hét, đùa nghịch, mở nhạc hoặc gây tiếng động lớn.",
    "Không nói tục, gây gổ kích động đánh nhau, tổ chức bẻ nhóm gây mất đoàn kết.",
    "Cấm tàng trữ, lưu hành truyền bá phim ảnh, băng đĩa hình, nhạc, văn hóa phẩm có nội dung đồi trụy, kích động bạo lực, các tài liệu tuyên truyền phản động và mê tín dị đoan.",
    "Không tổ chức tham gia các hoạt động cờ bạc, đánh bài, số đề, cá độ, mại dâm, quan hệ nam nữ trái đạo đức.",
    "Khi đến phải khai báo tạm trú tạm vắng với chính quyền địa phương.",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Header />
      
      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <Button 
            onClick={() => navigate(-1)} 
            icon={<ArrowLeftOutlined />}
            style={{ marginRight: 16 }}
          >
            Quay lại
          </Button>
        </div>
        
        <Card style={{ marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Nội quy phòng trọ
          </Title>
          
          <div style={{ background: "#fff", borderRadius: 8, padding: 24 }}>
            <ol style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              {rules.map((rule, index) => (
                <li key={index} style={{ marginBottom: 16, fontSize: 15 }}>
                  {rule}
                </li>
              ))}
            </ol>
            
            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              background: "#f0f8ff", 
              borderRadius: 8, 
              border: "1px solid #d6e4ff" 
            }}>
              <Paragraph style={{ 
                fontStyle: "italic", 
                marginBottom: 8, 
                color: "#1890ff",
                fontWeight: 500
              }}>
                Những quy định trên yêu cầu mọi người chấp hành nghiêm; vi phạm sẽ chịu trách nhiệm trước pháp luật và xử phạt của nhà trọ.
              </Paragraph>
              <div style={{ fontWeight: 600, color: "#1890ff" }}>
                Chủ nhà trọ: 0946882868
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
}


