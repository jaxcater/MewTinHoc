// ============================================================
//  NGÂN HÀNG CÂU HỎI ÔN TẬP - CHỦ ĐỀ CS 1: KĨ THUẬT LẬP TRÌNH
//  Nguồn: Cau_Hoi_On_Tap_Chu_De_CS_1_Ky_Thuat_Lap_Trinh_1.txt
//  Định hướng: Khoa học máy tính (CS)
// ============================================================

export const CHUONG_CS1_QUIZ = {
  stationId: 'cs_station_7',
  code: 'Chủ đề CS 1',
  title: 'Kĩ thuật lập trình',
  totalMcq: 20,
  totalTf: 4,
  totalItems: 36,
  mcq: [
    { id: 'cs1_mcq_1', q: 'Trong ngôn ngữ lập trình Python, cú pháp nào sau đây dùng để khai báo một danh sách (mảng 1D) gồm 4 số nguyên?', opts: ['a = [1, 3, 5, 7]', 'a = (1, 3, 5, 7)', 'a = {1, 3, 5, 7}', 'a = array(1, 3, 5, 7)'], ans: 0, exp: 'Danh sách (List) trong Python dùng cặp dấu ngoặc vuông [ ].' },
    { id: 'cs1_mcq_2', q: 'Cho mảng 1D trong Python a = [10, 20, 30, 40, 50]. Giá trị của phần tử a[2] là bao nhiêu?', opts: ['30', '20', '10', '40'], ans: 0, exp: 'Python đánh chỉ số từ 0 nên a[0]=10, a[1]=20, a[2]=30.' },
    { id: 'cs1_mcq_3', q: 'Trong thuật toán Tìm kiếm nhị phân (Binary Search), điều kiện BẮT BUỘC đối với danh sách đầu vào là gì?', opts: ['Danh sách đã được sắp xếp theo một thứ tự xác định (tăng dần hoặc giảm dần).', 'Tất cả các phần tử trong danh sách phải là số chẵn.', 'Độ dài danh sách phải là số lẻ.', 'Danh sách không được chứa quá 10 phần tử.'], ans: 0, exp: 'Tìm kiếm nhị phân chia đôi khoảng tìm kiếm dựa vào so sánh với phần tử giữa nên mảng bắt buộc phải được sắp xếp.' },
    { id: 'cs1_mcq_4', q: 'Độ phức tạp thời gian trường hợp xấu nhất của thuật toán Tìm kiếm nhị phân trên dãy n phần tử là bao nhiêu?', opts: ['O(log n)', 'O(n)', 'O(n^2)', 'O(1)'], ans: 0, exp: 'Mỗi bước chia đôi kích thước dãy còn n/2, n/4... nên số bước tối đa là log2(n), tức O(log n).' },
    { id: 'cs1_mcq_5', q: 'Cho đoạn mã Python: s = 0; for i in range(1, 5): s = s + i; print(s). Giá trị in ra của s là bao nhiêu?', opts: ['10', '15', '5', '4'], ans: 0, exp: 'range(1, 5) sinh ra i = 1, 2, 3, 4 nên s = 1 + 2 + 3 + 4 = 10.' },
    { id: 'cs1_mcq_6', q: 'Thuật toán Sắp xếp chèn (Insertion Sort) hoạt động theo nguyên lý cơ bản nào?', opts: ['Xây dựng dần dãy đã sắp xếp bằng cách lấy từng phần tử từ dãy chưa sắp xếp và chèn vào đúng vị trí trong dãy đã sắp xếp.', 'Chia đôi dãy thành hai nửa và sắp xếp đệ quy.', 'Đổi chỗ ngẫu nhiên các phần tử đến khi đúng thứ tự thì dừng.', 'Tìm phần tử nhỏ nhất và đổi chỗ với phần tử ở đầu dãy.'], ans: 0, exp: 'Insertion Sort duyệt từ phần tử thứ hai, chèn nó vào vị trí thích hợp trong đoạn phía trước đã sắp xếp.' },
    { id: 'cs1_mcq_7', q: 'Độ phức tạp thời gian trường hợp xấu nhất của thuật toán Sắp xếp chèn trên mảng n phần tử là bao nhiêu?', opts: ['O(n^2)', 'O(n log n)', 'O(n)', 'O(1)'], ans: 0, exp: 'Khi mảng sắp ngược chiều, hai vòng lặp lồng nhau thực hiện n*(n-1)/2 phép so sánh, tức O(n^2).' },
    { id: 'cs1_mcq_8', q: 'Hàm đệ quy (Recursive Function) là hàm có đặc điểm nào sau đây?', opts: ['Trong thân hàm có lời gọi lại chính hàm đó với tham số nhỏ hơn để tiến về trường hợp cơ sở (Base case).', 'Hàm không có tên và không trả về giá trị.', 'Hàm chứa tối đa 100 vòng lặp for lồng nhau.', 'Hàm chỉ chạy được trên hệ điều hành Linux.'], ans: 0, exp: 'Đệ quy chia bài toán lớn thành bài toán nhỏ hơn cùng dạng và gọi lại chính nó cho đến khi chạm trường hợp cơ sở.' },
    { id: 'cs1_mcq_9', q: 'Cho hàm đệ quy: def giaithua(n): if n == 0: return 1; return n * giaithua(n - 1). Giá trị trả về của giaithua(4) là bao nhiêu?', opts: ['24', '12', '6', '120'], ans: 0, exp: 'giaithua(4) = 4 * 3 * 2 * 1 * 1 = 24.' },
    { id: 'cs1_mcq_10', q: 'Kỹ thuật "Chạy vết mã lệnh" (Trace code) giúp người lập trình làm gì?', opts: ['Theo dõi sự thay đổi giá trị các biến và luồng điều khiển qua từng bước thực thi để kiểm tra tính đúng đắn hoặc tìm lỗi (Bug).', 'Tự động dịch mã nguồn sang tiếng Anh.', 'Tăng tốc độ CPU lên gấp đôi.', 'Nén tệp mã nguồn thành dạng mã hóa.'], ans: 0, exp: 'Trace code lập bảng ghi lại giá trị biến qua từng bước lặp để thẩm định logic chương trình.' },
    { id: 'cs1_mcq_11', q: 'Cho mảng 2D trong Python: M = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]. Giá trị của M[1][2] là bao nhiêu?', opts: ['6', '5', '8', '2'], ans: 0, exp: 'M[1] là hàng [4, 5, 6]. M[1][2] lấy cột chỉ số 2 của hàng đó, bằng 6.' },
    { id: 'cs1_mcq_12', q: 'Đoạn mã Python nào sau đây hoán đổi giá trị của hai biến a và b một cách chuẩn xác?', opts: ['a, b = b, a', 'a = b; b = a', 'a = b + a', 'a = b'], ans: 0, exp: 'Python hỗ trợ gán song song a, b = b, a để hoán đổi mà không cần biến trung gian.' },
    { id: 'cs1_mcq_13', q: 'Thuật toán Tìm kiếm tuyến tính (Linear Search) có độ phức tạp thời gian trường hợp xấu nhất là bao nhiêu?', opts: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], ans: 0, exp: 'Trường hợp xấu nhất (không thấy hoặc nằm ở cuối), thuật toán duyệt toàn bộ n phần tử nên là O(n).' },
    { id: 'cs1_mcq_14', q: 'Ký hiệu O(1) biểu diễn độ phức tạp thời gian như thế nào?', opts: ['Độ phức tạp hằng số, số bước thực hiện không phụ thuộc vào kích thước dữ liệu đầu vào n.', 'Tốc độ thực hiện tăng tuyến tính theo n.', 'Tốc độ thực hiện giảm đi một nửa khi n tăng.', 'Chương trình bị lỗi vòng lặp vô tận.'], ans: 0, exp: 'O(1) là thời gian hằng số, ví dụ truy cập phần tử mảng qua chỉ số a[i].' },
    { id: 'cs1_mcq_15', q: 'Trong C++, câu lệnh nào dùng để khai báo mảng số nguyên A gồm 10 phần tử?', opts: ['int A[10];', 'array A = 10;', 'integer A(10);', 'dim A(10) as integer;'], ans: 0, exp: 'Cú pháp khai báo mảng tĩnh trong C++ là KieuDuLieu TenMang[SoPhanTu];' },
    { id: 'cs1_mcq_16', q: 'Xét đoạn mã Python: a = [5, 2, 8, 1, 9]; m = a[0]; for x in a: if x > m: m = x. Đoạn mã trên thực hiện công việc gì?', opts: ['Tìm giá trị lớn nhất (Max) trong mảng a.', 'Tìm giá trị nhỏ nhất (Min) trong mảng a.', 'Tính tổng các phần tử trong mảng a.', 'Đếm số lượng số chẵn trong mảng a.'], ans: 0, exp: 'Khởi tạo m = a[0], duyệt từng x và cập nhật m = x nếu x > m. Đây là thuật toán tìm Max.' },
    { id: 'cs1_mcq_17', q: 'Phép cắt lát (Slice) a[1:4] trên danh sách a = [10, 20, 30, 40, 50, 60] trả về kết quả nào?', opts: ['[20, 30, 40]', '[10, 20, 30, 40]', '[20, 30, 40, 50]', '[10, 20, 30]'], ans: 0, exp: 'a[start:stop] lấy từ chỉ số start đến stop - 1, tức các chỉ số 1, 2, 3 ứng với [20, 30, 40].' },
    { id: 'cs1_mcq_18', q: 'Lỗi "vòng lặp vô tận" (Infinite Loop) xảy ra khi nào?', opts: ['Điều kiện dừng của vòng lặp không bao giờ thỏa mãn (điều kiện lặp luôn ĐÚNG).', 'Mảng đầu vào có dung lượng quá lớn.', 'Tệp mã nguồn quên không lưu.', 'Biến đếm có giá trị bằng 0.'], ans: 0, exp: 'Nếu điều kiện lặp luôn đúng và không có lệnh break, vòng lặp chạy mãi và làm treo chương trình.' },
    { id: 'cs1_mcq_19', q: 'Trường hợp cơ sở (Base case) trong hàm đệ quy có vai trò quyết định nào?', opts: ['Cung cấp điều kiện dừng để hàm không gọi lại chính nó nữa, tránh tràn bộ nhớ Stack.', 'Tự động sửa lỗi cú pháp.', 'Tăng tốc độ đồ họa máy tính.', 'Chuyển đổi ngôn ngữ C++ sang Python.'], ans: 0, exp: 'Thiếu trường hợp cơ sở, hàm đệ quy gọi vô hạn và gây lỗi tràn bộ nhớ gọi hàm (Stack Overflow).' },
    { id: 'cs1_mcq_20', q: 'Sắp xếp theo thứ tự độ phức tạp thời gian tăng dần (thực thi chậm dần) nào sau đây là ĐÚNG?', opts: ['O(1) < O(log n) < O(n) < O(n^2)', 'O(n^2) < O(n) < O(log n) < O(1)', 'O(n) < O(1) < O(n^2) < O(log n)', 'O(log n) < O(1) < O(n^2) < O(n)'], ans: 0, exp: 'Hằng số O(1) nhanh nhất, rồi O(log n), O(n) tuyến tính, và O(n^2) bình phương chậm nhất.' }
  ],
  tf: [
    { id: 'cs1_tf_1', ctx: 'Tìm kiếm nhị phân: cho dãy số nguyên đã sắp xếp tăng dần a = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]. Cần tìm giá trị x = 23.', items: [
      { s: 'Thuật toán Tìm kiếm nhị phân có thể áp dụng ngay trên dãy a vì dãy đã được sắp xếp tăng dần.', ans: true, exp: 'Mảng đã sắp xếp là điều kiện tiên quyết để chạy Binary Search.' },
      { s: 'Ở bước đầu tiên, mid = (0 + 9) // 2 = 4, a[4] = 16. Vì 23 > 16 nên thu hẹp phạm vi tìm kiếm sang nửa bên phải [23, 38, 56, 72, 91].', ans: true, exp: 'x lớn hơn giá trị giữa nên bỏ nửa trái, tìm tiếp ở nửa phải.' },
      { s: 'Số phép so sánh tối đa để tìm thấy x bằng nhị phân trên dãy 10 phần tử này là không quá 4 phép so sánh.', ans: true, exp: 'Vì 2^4 = 16 > 10 nên số bước tối đa là ceil(log2(10)) = 4.' },
      { s: 'Nếu dãy a chưa được sắp xếp, thuật toán Tìm kiếm nhị phân vẫn luôn cho kết quả tìm kiếm đúng.', ans: false, exp: 'Với mảng chưa sắp xếp, Binary Search có thể bỏ sót phần tử và cho kết quả sai.' }
    ] },
    { id: 'cs1_tf_2', ctx: 'Chạy vết (Trace code) thuật toán sắp xếp chèn: xét mảng a = [5, 1, 4, 2] cần sắp xếp theo thứ tự tăng dần.', items: [
      { s: 'Sau bước chèn phần tử thứ hai (giá trị 1) vào đúng vị trí phía trước, mảng trở thành [1, 5, 4, 2].', ans: true, exp: 'Giá trị 1 nhỏ hơn 5 nên được chèn lên trước 5.' },
      { s: 'Ở trạng thái cuối cùng sau khi sắp xếp xong hoàn toàn, mảng nhận giá trị [1, 2, 4, 5].', ans: true, exp: 'Kết quả tăng dần chính xác là [1, 2, 4, 5].' },
      { s: 'Độ phức tạp thời gian của thuật toán sắp xếp chèn trong trường hợp mảng đã tăng dần sẵn từ đầu là O(n^2).', ans: false, exp: 'Khi mảng đã sắp xếp sẵn (trường hợp tốt nhất), mỗi phần tử chỉ cần 1 phép so sánh nên độ phức tạp là O(n).' },
      { s: 'Bảng chạy vết biến qua từng bước giúp học sinh hiểu rõ luồng đổi chỗ và chuyển dịch phần tử trong bộ nhớ.', ans: true, exp: 'Trace code là kỹ thuật phân tích luồng chạy thực tế của thuật toán.' }
    ] },
    { id: 'cs1_tf_3', ctx: 'Hàm đệ quy tính số Fibonacci thứ n trong Python: def fib(n): if n <= 1: return n; return fib(n - 1) + fib(n - 2).', items: [
      { s: 'Trường hợp cơ sở (Base case) của hàm là khi n <= 1, hàm trả về giá trị n.', ans: true, exp: 'n <= 1 dừng đệ quy và trả về 0 (với n = 0) hoặc 1 (với n = 1).' },
      { s: 'Giá trị của fib(4) bằng 3.', ans: true, exp: 'Dãy Fibonacci: fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, fib(4)=3.' },
      { s: 'Nếu xóa hai dòng kiểm tra "if n <= 1: return n", hàm vẫn hoạt động bình thường mà không gây lỗi.', ans: false, exp: 'Thiếu điều kiện dừng thì đệ quy gọi vô hạn và báo lỗi RecursionError (Stack Overflow).' },
      { s: 'Độ phức tạp thời gian của thuật toán đệ quy Fibonacci thuần túy ở trên là O(2^n), rất chậm khi n lớn.', ans: true, exp: 'Cây gọi đệ quy nhân đôi ở mỗi cấp nên số phép tính tăng theo cấp số nhân O(2^n).' }
    ] },
    { id: 'cs1_tf_4', ctx: 'Mảng 2D (ma trận) trong Python: A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]; tong = 0; for i in range(len(A)): tong += A[i][i].', items: [
      { s: 'Ma trận A có 3 hàng và 3 cột (kích thước 3x3).', ans: true, exp: 'len(A) = 3 và mỗi hàng chứa 3 phần tử.' },
      { s: 'Biến i chạy qua các giá trị 0, 1, 2. Phần tử A[i][i] truy cập các phần tử nằm trên đường chéo chính (A[0][0], A[1][1], A[2][2]).', ans: true, exp: 'Chỉ số hàng bằng chỉ số cột (i = j) chính là đường chéo chính.' },
      { s: 'Sau khi kết thúc vòng lặp, giá trị của biến tong là 1 + 5 + 9 = 15.', ans: true, exp: 'A[0][0]=1, A[1][1]=5, A[2][2]=9 nên tổng bằng 15.' },
      { s: 'Để tính tổng tất cả các phần tử trong ma trận A, chỉ cần một vòng lặp đơn là đủ.', ans: false, exp: 'Duyệt toàn bộ ma trận 2D cần hai vòng lặp lồng nhau (hàng và cột), hoặc dùng hàm tổng gộp.' }
    ] }
  ]
};
