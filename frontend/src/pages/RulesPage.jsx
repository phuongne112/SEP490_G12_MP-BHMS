import React from "react";

export default function RulesPage() {
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
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        <h1 style={{ color: "#fff", textAlign: "center", marginBottom: 24 }}>Nội quy phòng trọ</h1>
        <div style={{ background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
          <ol style={{ paddingLeft: 18, lineHeight: 1.6 }}>
            {rules.map((r, i) => (
              <li key={i} style={{ marginBottom: 12 }}>{r}</li>
            ))}
          </ol>
          <div style={{ marginTop: 16, fontStyle: "italic" }}>
            Những quy định trên yêu cầu mọi người chấp hành nghiêm; vi phạm sẽ chịu trách nhiệm trước pháp luật và xử phạt của nhà trọ.
          </div>
          <div style={{ marginTop: 16, fontWeight: 600 }}>Chủ nhà trọ: 0946 882 868 - 0914 361 239</div>
        </div>
      </div>
    </div>
  );
}


