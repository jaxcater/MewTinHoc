// ============================================================
//  NGÂN HÀNG CÂU HỎI ÔN TẬP - CHƯƠNG 7: LẬP TRÌNH PYTHON CƠ BẢN
//  Nguồn: Cau_Hoi_Trac_Nghiem_Nhan_Dinh_Chuong_Trinh_Python.txt
//  Định hướng: dùng chung cho cả CS và ICT
// ============================================================

export const CHUONG_7_QUIZ = {
  stationId: 'cs_station_10',
  code: 'Chương 7',
  title: 'Lập trình Python cơ bản',
  totalMcq: 16,
  totalTf: 0,
  totalItems: 16,
  mcq: [
    { id: 'c7_mcq_1', q: 'Cho đoạn chương trình Python sau:', code: [
      { lang: 'Python', lines: [
        'a = [10, 20, 30, 40, 50, 60]',
        'b = a[1:5:2]',
        'print(b)'
      ] }
    ], qAfter: 'Kết quả hiển thị ra màn hình là gì?', opts: ['[20, 40]', '[20, 30, 40]', '[10, 30, 50]', '[20, 50]'], ans: 0, exp: 'Cú pháp lát cắt a[start:stop:step] với start=1 (giá trị 20), stop=5 (không lấy phần tử chỉ số 5), bước nhảy step=2 sẽ duyệt qua các chỉ số 1 và 3, tương ứng với các giá trị [20, 40].' },
    { id: 'c7_mcq_2', q: 'Cho đoạn mã nguồn Python sau:', code: [
      { lang: 'Python', lines: [
        'a = [1, 2, 3]',
        'b = a',
        'b.append(4)',
        'print(len(a), a[-1])'
      ] }
    ], qAfter: 'Kết quả in ra màn hình là gì?', opts: ['3 3', '4 4', '3 4', '4 3'], ans: 1, exp: 'Phép gán b = a trong Python là gán tham chiếu cùng trỏ tới một vùng nhớ danh sách. Khi b.append(4) thay đổi danh sách thì a cũng thay đổi theo, do đó độ dài của a là 4 và phần tử cuối cùng a[-1] là 4.' },
    { id: 'c7_mcq_3', q: 'Cho đoạn chương trình Python sau:', code: [
      { lang: 'Python', lines: [
        'matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]',
        's = 0',
        'for i in range(len(matrix)):',
        '    s += matrix[i][i]',
        'print(s)'
      ] }
    ], qAfter: 'Đoạn mã trên thực hiện công việc gì và in ra kết quả bao nhiêu?', opts: ['Tính tổng các phần tử của hàng đầu tiên; kết quả là 6.', 'Tính tổng các phần tử trên đường chéo chính của ma trận; kết quả là 15.', 'Tính tổng tất cả các phần tử trong ma trận; kết quả là 45.', 'Tính tổng các phần tử trên đường chéo phụ; kết quả là 15.'], ans: 1, exp: 'Biến i chạy từ 0 đến 2, matrix[i][i] lần lượt truy cập các phần tử trên đường chéo chính: matrix[0][0] = 1, matrix[1][1] = 5, matrix[2][2] = 9. Tổng s = 1 + 5 + 9 = 15.' },
    { id: 'c7_mcq_4', q: 'Cho đoạn chương trình Python sau cài đặt một thuật toán sắp xếp mảng:', code: [
      { lang: 'Python', lines: [
        'def sort_arr(A):',
        '    n = len(A)',
        '    for i in range(n - 1):',
        '        min_idx = i',
        '        for j in range(i + 1, n):',
        '            if A[j] < A[min_idx]:',
        '                min_idx = j',
        '        A[i], A[min_idx] = A[min_idx], A[i]',
        '    return A'
      ] }
    ], qAfter: 'Thuật toán trên là thuật toán nào và có độ phức tạp thời gian trong trường hợp xấu nhất là bao nhiêu?', opts: ['Sắp xếp chèn (Insertion Sort); độ phức tạp O(n log n).', 'Sắp xếp nổi bọt (Bubble Sort); độ phức tạp O(n^2).', 'Sắp xếp chọn (Selection Sort); độ phức tạp O(n^2).', 'Sắp xếp nhanh (Quick Sort); độ phức tạp O(n).'], ans: 2, exp: 'Thuật toán tìm vị trí phần tử nhỏ nhất min_idx trong đoạn chưa sắp xếp A[i..n-1] rồi đổi chỗ với A[i] chính là thuật toán Sắp xếp chọn (Selection Sort). Độ phức tạp thời gian luôn là O(n^2) trong mọi trường hợp.' },
    { id: 'c7_mcq_5', q: 'Cho danh sách A = [5, 2, 4, 6, 1]. Người ta áp dụng thuật toán Sắp xếp chèn (Insertion Sort) theo chiều tăng dần:', code: [
      { lang: 'Python', lines: [
        'for i in range(1, len(A)):',
        '    key = A[i]',
        '    j = i - 1',
        '    while j >= 0 and A[j] > key:',
        '        A[j + 1] = A[j]',
        '        j -= 1',
        '    A[j + 1] = key'
      ] }
    ], qAfter: 'Sau khi vòng lặp ngoài thực hiện xong bước i = 1, trạng thái của danh sách A là gì?', opts: ['[2, 5, 4, 6, 1]', '[1, 2, 4, 5, 6]', '[2, 4, 5, 6, 1]', '[5, 2, 4, 6, 1]'], ans: 0, exp: 'Tại bước i = 1, key = A[1] = 2. Vì A[0] = 5 > 2 nên 5 dời sang phải thành A[1] = 5, sau đó chèn key vào A[0]. Trạng thái danh sách trở thành [2, 5, 4, 6, 1].' },
    { id: 'c7_mcq_6', q: 'Cho hàm tìm kiếm nhị phân được cài đặt bằng Python như sau:', code: [
      { lang: 'Python', lines: [
        'def binary_search(A, x):',
        '    left = 0',
        '    right = len(A) - 1',
        '    count = 0',
        '    while left <= right:',
        '        count += 1',
        '        mid = (left + right) // 2',
        '        if A[mid] == x:',
        '            return count',
        '        elif A[mid] < x:',
        '            left = mid + 1',
        '        else:',
        '            right = mid - 1',
        '    return count'
      ] }
    ], qAfter: 'Cho danh sách đã sắp xếp A = [11, 22, 33, 44, 55, 66, 77, 88]. Khi gọi binary_search(A, 55), giá trị trả về của biến count là bao nhiêu?', opts: ['1', '2', '3', '4'], ans: 2, exp: 'Ban đầu left=0, right=7: lần 1 (count=1), mid=(0+7)//2=3 (A[3]=44 < 55) -> left=4. Lần 2 (count=2), mid=(4+7)//2=5 (A[5]=66 > 55) -> right=4. Lần 3 (count=3), mid=(4+4)//2=4 (A[4]=55 == 55) -> trả về count = 3.' },
    { id: 'c7_mcq_7', q: 'Cho hàm đệ quy Python sau:', code: [
      { lang: 'Python', lines: [
        'def f(n):',
        '    if n <= 1:',
        '        return 1',
        '    return n * f(n - 1)',
        '',
        'print(f(4))'
      ] }
    ], qAfter: 'Khi thực thi, chương trình in ra kết quả là bao nhiêu và sử dụng cấu trúc dữ liệu nào trong bộ nhớ hệ thống để quản lý các lời gọi đệ quy?', opts: ['24; sử dụng Ngăn xếp hệ thống (Call Stack).', '10; sử dụng Hàng đợi (Queue).', '24; sử dụng Mảng hai chiều (Matrix).', '12; sử dụng Danh sách liên kết (Linked List).'], ans: 0, exp: 'Hàm tính giai thừa f(4) = 4 * 3 * 2 * 1 = 24. Khi thực thi các lời gọi hàm đệ quy, máy tính sử dụng vùng nhớ Ngăn xếp hệ thống (Call Stack) theo cơ chế LIFO để lưu vết địa chỉ trở về và biến cục bộ.' },
    { id: 'c7_mcq_8', q: 'Cho đoạn chương trình Python mô phỏng cấu trúc dữ liệu:', code: [
      { lang: 'Python', lines: [
        'stack = []',
        'for x in [3, 7, 2, 9]:',
        '    stack.append(x)',
        'stack.pop()',
        'stack.append(5)',
        'top_item = stack[-1]',
        'print(top_item, len(stack))'
      ] }
    ], qAfter: 'Kết quả in ra màn hình là gì?', opts: ['9 4', '5 4', '5 5', '2 3'], ans: 1, exp: 'Thêm 3, 7, 2, 9 vào stack -> stack = [3, 7, 2, 9]. Lệnh stack.pop() loại bỏ phần tử đỉnh 9 -> stack = [3, 7, 2]. Tiếp tục stack.append(5) -> stack = [3, 7, 2, 5]. Đỉnh stack là 5 và độ dài danh sách len(stack) = 4.' },
    { id: 'c7_mcq_9', q: 'Cho đoạn mã nguồn Python sau:', code: [
      { lang: 'Python', lines: [
        's = "TinHoc2026"',
        'res = ""',
        'for ch in s:',
        '    if ch.isdigit():',
        '        res += ch',
        'print(res)'
      ] }
    ], qAfter: 'Đoạn mã trên thực hiện công việc gì và in ra kết quả gì?', opts: ["Đếm số ký tự chữ hoa trong chuỗi; in ra 'TH'.", "Trích xuất tất cả các ký tự chữ số trong chuỗi s; in ra '2026'.", "Kiểm tra xem chuỗi có phải toàn số không; in ra 'False'.", "Đảo ngược chuỗi ban đầu; in ra '6202coHniT'."], ans: 1, exp: 'Phương thức ch.isdigit() kiểm tra ký tự ch có phải là chữ số hay không. Vòng lặp duyệt qua chuỗi và ghép các chữ số lại, kết quả thu được chuỗi "2026".' },
    { id: 'c7_mcq_10', q: 'Cho đoạn chương trình Python sử dụng List Comprehension:', code: [
      { lang: 'Python', lines: [
        'nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]',
        'evens_squared = [x**2 for x in nums if x % 2 == 0]',
        'print(evens_squared)'
      ] }
    ], qAfter: 'Kết quả hiển thị trên màn hình là gì?', opts: ['[1, 4, 9, 16, 25, 36, 49, 64, 81]', '[4, 16, 36, 64]', '[2, 4, 6, 8]', '[4, 8, 12, 16]'], ans: 1, exp: 'Điều kiện if x % 2 == 0 lọc các số chẵn trong nums: [2, 4, 6, 8]. Biểu thức x**2 tính bình phương các số đó: 2^2=4, 4^2=16, 6^2=36, 8^2=64. Kết quả là danh sách [4, 16, 36, 64].' },
    { id: 'c7_mcq_11', q: 'Cho đoạn chương trình Python sau:', code: [
      { lang: 'Python', lines: [
        'n = 5',
        'count = 0',
        'for i in range(n):',
        '    for j in range(i + 1, n):',
        '        count += 1',
        'print(count)'
      ] }
    ], qAfter: 'Giá trị in ra của biến count là bao nhiêu và số lần thực hiện lệnh tương đương công thức nào?', opts: ['10; tương đương công thức n*(n - 1)//2.', '25; tương đương công thức n*n.', '20; tương đương công thức n*(n - 1).', '15; tương đương công thức n*(n + 1)//2.'], ans: 0, exp: 'Với i=0, j chạy từ 1 đến 4 (4 lần); i=1, j chạy 2..4 (3 lần); i=2 (2 lần); i=3 (1 lần); i=4 (0 lần). Tổng số lần count += 1 là 4 + 3 + 2 + 1 = 10, đúng theo công thức tổ hợp n*(n - 1)//2 = 5*4//2 = 10.' },
    { id: 'c7_mcq_12', q: 'Cho đoạn chương trình Python sau:', code: [
      { lang: 'Python', lines: [
        'x = 10',
        'def change():',
        '    global x',
        '    x = 20',
        '    y = 30',
        '',
        'change()',
        'print(x)'
      ] }
    ], qAfter: 'Kết quả in ra màn hình là gì?', opts: ['10', '20', '30', 'Báo lỗi NameError'], ans: 1, exp: "Từ khóa 'global x' bên trong hàm change() khai báo cho Python biết hàm đang can thiệp và sửa đổi trực tiếp biến toàn cục x bên ngoài hàm. Khi gán x = 20 thì biến toàn cục x được cập nhật thành 20." },
    { id: 'c7_mcq_13', q: 'Cho đoạn chương trình Python thao tác với kiểu dữ liệu Dictionary:', code: [
      { lang: 'Python', lines: [
        'd = {"Toan": 8.5, "Van": 7.0, "Anh": 9.0}',
        'd["Tin"] = 9.5',
        'd["Van"] = 8.0',
        'print(len(d), d["Van"])'
      ] }
    ], qAfter: 'Kết quả hiển thị trên màn hình là gì?', opts: ['4 7.0', '5 8.0', '4 8.0', '3 9.5'], ans: 2, exp: "Lệnh d['Tin'] = 9.5 thêm khóa mới 'Tin' (tổng cộng 4 khóa). Lệnh d['Van'] = 8.0 cập nhật giá trị của khóa đã tồn tại 'Van' từ 7.0 thành 8.0 mà không tăng số lượng phần tử. Do đó len(d) = 4 và d['Van'] = 8.0." },
    { id: 'c7_mcq_14', q: 'Cho đoạn chương trình Python sau:', code: [
      { lang: 'Python', lines: [
        'A = [12, 45, 19, 82, 33, 82]',
        'max_val = A[0]',
        'max_idx = 0',
        'for i in range(1, len(A)):',
        '    if A[i] > max_val:',
        '        max_val = A[i]',
        '        max_idx = i',
        'print(max_idx, max_val)'
      ] }
    ], qAfter: 'Kết quả in ra màn hình là gì?', opts: ['3 82', '5 82', '82 3', '4 45'], ans: 0, exp: 'Điều kiện so sánh nghiêm ngặt A[i] > max_val chỉ cập nhật khi gặp giá trị lớn hơn hẳn max_val hiện tại. Giá trị 82 đầu tiên xuất hiện tại chỉ số i = 3. Khi gặp phần tử 82 thứ hai tại chỉ số i = 5, do 82 không lớn hơn 82 nên max_idx không đổi, vẫn giữ nguyên là 3.' },
    { id: 'c7_mcq_15', q: 'Cho hàm đệ quy sau trong Python:', code: [
      { lang: 'Python', lines: [
        'def mystery(a, b):',
        '    if b == 0:',
        '        return 0',
        '    return a + mystery(a, b - 1)',
        '',
        'print(mystery(6, 4))'
      ] }
    ], qAfter: 'Hàm mystery thực hiện phép toán số học nào và in ra kết quả bao nhiêu?', opts: ['Tính lũy thừa 6^4 = 1296.', 'Tính tích của hai số a * b; in ra kết quả 24.', 'Tính tổng của hai số a + b; in ra kết quả 10.', 'Tìm ước chung lớn nhất của 6 và 4; in ra kết quả 2.'], ans: 1, exp: 'Hàm cộng dồn b lần giá trị a với trường hợp cơ sở b=0 trả về 0. Đây chính là định nghĩa phép nhân qua phép cộng: mystery(a, b) = a * b. Kết quả mystery(6, 4) = 6 * 4 = 24.' },
    { id: 'c7_mcq_16', q: 'Cho đoạn chương trình Python sau:', code: [
      { lang: 'Python', lines: [
        'A = [1, 2, 3, 4, 5, 6, 7]',
        'A = A[::-1]',
        'b = [x for x in A if x % 2 != 0]',
        'print(b)'
      ] }
    ], qAfter: 'Kết quả in ra màn hình là gì?', opts: ['[1, 3, 5, 7]', '[7, 5, 3, 1]', '[6, 4, 2]', '[7, 6, 5, 4, 3, 2, 1]'], ans: 1, exp: 'Thao tác lát cắt A[::-1] đảo ngược danh sách ban đầu thành A = [7, 6, 5, 4, 3, 2, 1]. Sau đó List Comprehension duyệt qua A và chỉ chọn các số lẻ (x % 2 != 0), thu được danh sách [7, 5, 3, 1].' }
  ],
  tf: []
};
