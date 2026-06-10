/**
 * ฟังก์ชันช่วยสร้าง Base64 Thumbnail จากไฟล์รูปภาพหรือวิดีโอฝั่ง Client
 */

export const generateThumbnail = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const fileType = file.type;

    if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 150;
          let width = img.width;
          let height = img.height;

          // คำนวณรักษาสัดส่วนภาพ (Aspect Ratio)
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // บีบอัดคุณภาพ 70%
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } 
    else if (fileType.startsWith('video/')) {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        const videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;

        video.onloadeddata = () => {
          // ดึงภาพที่วินาทีที่ 1 เพื่อหลีกเลี่ยงเฟรมสีดำตอนเริ่มวิดีโอ
          video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 150;
            let width = video.videoWidth || 300;
            let height = video.videoHeight || 150;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              resolve(dataUrl);
            } else {
              resolve(null);
            }
            // เคลียร์ memory
            URL.revokeObjectURL(videoUrl);
          } catch (err) {
            resolve(null);
          }
        };

        video.onerror = () => {
          URL.revokeObjectURL(videoUrl);
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    } 
    else {
      // สำหรับไฟล์ประเภทอื่น ไม่ต้องทำ thumbnail
      resolve(null);
    }
  });
};
export default generateThumbnail;
