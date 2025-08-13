-- Script cập nhật giá trị enum Gender từ tiếng Anh sang tiếng Việt
-- Chạy script này để cập nhật dữ liệu cũ trong database

-- Cập nhật bảng UserInfo (tên bảng chính xác trong database)
UPDATE "UserInfo" 
SET gender = 'Nam' 
WHERE gender = 'Male';

UPDATE "UserInfo" 
SET gender = 'Nữ' 
WHERE gender = 'Female';

UPDATE "UserInfo" 
SET gender = 'Khác' 
WHERE gender = 'Other';

-- Kiểm tra kết quả
SELECT 'UserInfo' as table_name, gender, COUNT(*) as count 
FROM "UserInfo" 
GROUP BY gender;
