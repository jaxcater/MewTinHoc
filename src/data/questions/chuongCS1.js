// ============================================================
//  NGÂN HÀNG CÂU HỎI ÔN TẬP - CHỦ ĐỀ CS 1: KĨ THUẬT LẬP TRÌNH
//  Nguồn: Ki_Thuat_Lap_Trinh_Nang_Cao (1).js (Phần I)
//         Bo_4_Cau_Hoi_Dung_Sai_Nhan_Biet_Thuat_Toan.txt (Phần II)
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
    { id: 'cs1_mcq_1', q: 'Cho đoạn mã nguồn Python sau: def sort_algo(a): n = len(a); for i in range(n - 1): m = i; for j in range(i + 1, n): if a[j] < a[m]: m = j; a[i], a[m] = a[m], a[i]; return a. Đoạn mã trên cài đặt thuật toán sắp xếp nào?', opts: ['Thuật toán sắp xếp nổi bọt (Bubble Sort)', 'Thuật toán sắp xếp chọn (Selection Sort)', 'Thuật toán sắp xếp chèn (Insertion Sort)', 'Thuật toán sắp xếp nhanh (QuickSort)'], ans: 1, exp: 'Đoạn mã trên tìm chỉ số phần tử nhỏ nhất m trong đoạn chưa sắp xếp a[i..n-1] rồi hoán đổi với a[i]. Đây chính là thuật toán Sắp xếp chọn (Selection Sort).' },
    { id: 'cs1_mcq_2', q: 'Cho đoạn mã Python sau: def mystery_sort(arr): for i in range(1, len(arr)): key = arr[i]; j = i - 1; while j >= 0 and arr[j] > key: arr[j + 1] = arr[j]; j -= 1; arr[j + 1] = key; return arr. Đoạn mã trên mô tả thuật toán nào và số phép gán khóa (key) tối thiểu khi mảng đã có thứ tự tăng dần là bao nhiêu?', opts: ['Thuật toán Sắp xếp nổi bọt; số phép gán khóa là n-1', 'Thuật toán Sắp xếp chọn; số phép gán khóa là 0', 'Thuật toán Sắp xếp chèn; số phép gán khóa là n-1', 'Thuật toán QuickSort; số phép gán khóa là 1'], ans: 2, exp: 'Vòng lặp while dịch chuyển các phần tử lớn hơn key về sau và chèn key vào đúng vị trí của đoạn con đã sắp xếp, đây là thuật toán Sắp xếp chèn (Insertion Sort). Vòng lặp ngoài duyệt từ 1 đến n-1 (tổng cộng n-1 lần gán key = arr[i]).' },
    { id: 'cs1_mcq_3', q: 'Cho đoạn mã Python sau: def bubble_optimized(arr): n = len(arr); for i in range(n): swapped = False; for j in range(0, n - i - 1): if arr[j] > arr[j + 1]: arr[j], arr[j + 1] = arr[j + 1], arr[j]; swapped = True; if not swapped: break; return arr. Biến swapped có vai trò gì trong việc nhận biết và tối ưu thuật toán?', opts: ['Đếm tổng số lần hoán đổi phần tử của mảng', 'Dừng thuật toán sớm khi mảng đã hoàn toàn có thứ tự, giảm độ phức tạp tốt nhất xuống O(n)', 'Giúp thuật toán chuyển sang thuật toán tìm kiếm nhị phân', 'Xác định phần tử lớn nhất trong mảng sau mỗi lần lặp'], ans: 1, exp: 'Biến cờ hiệu swapped kiểm tra xem trong lượt duyệt có xảy ra phép đổi chỗ nào không. Nếu không có phép đổi chỗ nào xảy ra (not swapped), mảng đã có thứ tự tăng dần và vòng lặp dừng ngay lập tức, đạt độ phức tạp O(n).' },
    { id: 'cs1_mcq_4', q: 'Cho hàm Python tìm kiếm sau: def search_item(arr, x): for i in range(len(arr)): if arr[i] == x: return i; return -1. Nhận định nào sau đây là ĐÚNG về thuật toán trên?', opts: ['Đây là thuật toán Tìm kiếm nhị phân, chỉ chạy được trên mảng đã sắp xếp', 'Đây là thuật toán Tìm kiếm tuần tự, có thể chạy trên mảng bất kỳ chưa cần sắp xếp với độ phức tạp xấu nhất O(n)', 'Độ phức tạp thời gian luôn luôn là O(log n) trong mọi trường hợp', 'Hàm trả về giá trị x nếu tìm thấy, ngược lại trả về 0'], ans: 1, exp: 'Hàm duyệt tuần tự từ đầu đến cuối danh sách arr. Đây là thuật toán Tìm kiếm tuần tự (Sequential/Linear Search), áp dụng được cho mảng bất kì không cần sắp xếp trước.' },
    { id: 'cs1_mcq_5', q: 'Cho hàm Python sau: def binary_search(arr, x): left = 0; right = len(arr) - 1; while left <= right: mid = (left + right) // 2; if arr[mid] == x: return mid; elif arr[mid] < x: left = mid + 1; else: right = mid - 1; return -1. Với danh sách arr = [3, 7, 12, 19, 25, 31, 42, 58, 63] và x = 42, giá trị của mid trong các bước lặp lần lượt là:', opts: ['4, 6', '4, 7, 6', '3, 5, 6', '4, 5, 6'], ans: 0, exp: 'Mảng có 9 phần tử (chỉ số 0 đến 8). Bước 1: left=0, right=8 -> mid=(0+8)//2=4 (arr[4]=25 < 42) -> left=5. Bước 2: left=5, right=8 -> mid=(5+8)//2=6 (arr[6]=42 == 42) -> tìm thấy! Vậy các giá trị mid là 4 và 6.' },
    { id: 'cs1_mcq_6', q: 'Xét đoạn mã nguồn cài đặt thuật toán QuickSort trong Python: def quick_sort(arr): if len(arr) <= 1: return arr; pivot = arr[len(arr) // 2]; left = [x for x in arr if x < pivot]; middle = [x for x in arr if x == pivot]; right = [x for x in arr if x > pivot]; return quick_sort(left) + middle + quick_sort(right). Thuật toán trên ứng dụng kỹ thuật thiết kế nào và phần tử pivot đóng vai trò gì?', opts: ['Kỹ thuật Tham lam; pivot là phần tử nhỏ nhất mảng', 'Kỹ thuật Chia để trị (Divide and Conquer); pivot là phần tử chốt để phân hoạch mảng thành các mảng con', 'Kỹ thuật Quy hoạch động; pivot là giá trị cơ sở lưu bảng', 'Kỹ thuật Nhánh cận; pivot là giá trị giới hạn trên'], ans: 1, exp: 'QuickSort sử dụng kỹ thuật Chia để trị: chia bài toán bằng cách chọn chốt (pivot), phân hoạch mảng thành các phần tử nhỏ hơn pivot và lớn hơn pivot, sau đó đệ quy giải từng phần tử.' },
    { id: 'cs1_mcq_7', q: "Cho hàm đệ quy tính lũy thừa sau: def power(a, n): if n == 0: return 1; return a * power(a, n - 1). Dòng lệnh nào đóng vai trò là 'Trường hợp cơ sở' (Base case) ngăn đệ quy vô hạn?", opts: ['def power(a, n):', 'return a * power(a, n - 1)', 'if n == 0: return 1', 'power(a, n - 1)'], ans: 2, exp: 'Điều kiện dừng if n == 0: return 1 là Trường hợp cơ sở (Base Case) để kết thúc các lời gọi đệ quy khi lũy thừa về 0.' },
    { id: 'cs1_mcq_8', q: 'Cho hàm đệ quy sau: def calc(n): if n <= 1: return 1; return n + calc(n - 2); print(calc(5)). Kết quả hiển thị ra màn hình khi chạy chương trình là:', opts: ['9', '15', '8', '6'], ans: 0, exp: 'Diễn giải lời gọi đệ quy: calc(5) = 5 + calc(3); calc(3) = 3 + calc(1); calc(1) = 1. Thay ngược lại: calc(3) = 3 + 1 = 4; calc(5) = 5 + 4 = 9.' },
    { id: 'cs1_mcq_9', q: 'Cho đoạn mã Python sau: a = [10, 20, 30]; b = a; c = a[:]; b.append(40); c.append(50); print(len(a), a[-1]). Kết quả hiển thị trên màn hình là:', opts: ['3 30', '4 40', '5 50', '4 50'], ans: 1, exp: 'b = a là phép gán tham chiếu, biến đổi b làm thay đổi a, do đó b.append(40) thêm 40 vào a (a có 4 phần tử, a[-1] là 40). c = a[:] tạo bản sao độc lập, thay đổi c không ảnh hưởng a.' },
    { id: 'cs1_mcq_10', q: 'Cho danh sách a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]. Kết quả của thao tác a[8:1:-2] là:', opts: ['[8, 6, 4, 2]', '[8, 6, 4, 2, 0]', '[7, 5, 3]', '[8, 6, 4]'], ans: 0, exp: 'Lát cắt start=8, stop=1, step=-2 sẽ bắt đầu từ chỉ số 8 lùi dần mỗi lần 2 đơn vị: chỉ số 8 (giá trị 8), chỉ số 6 (giá trị 6), chỉ số 4 (giá trị 4), chỉ số 2 (giá trị 2). Chỉ số tiếp theo là 0 <= 1 nên dừng. Kết quả: [8, 6, 4, 2].' },
    { id: 'cs1_mcq_11', q: 'Cho đoạn mã Python sau: m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]; total = 0; for i in range(len(m)): total += m[i][len(m) - 1 - i]; print(total). Đoạn mã trên tính toán điều gì và in ra giá trị bao nhiêu?', opts: ['Tổng các phần tử trên đường chéo chính; kết quả 15', 'Tổng các phần tử trên đường chéo phụ; kết quả 15', 'Tổng tất cả các phần tử trong ma trận; kết quả 45', 'Tổng hàng cuối cùng; kết quả 24'], ans: 1, exp: 'm[i][len(m) - 1 - i] truy cập vào các phần tử trên đường chéo phụ: m[0][2] = 3, m[1][1] = 5, m[2][0] = 7. Tổng = 3 + 5 + 7 = 15.' },
    { id: 'cs1_mcq_12', q: 'Xét đoạn mã mô phỏng cấu trúc dữ liệu Ngăn xếp (Stack) trong Python: stack = []; for x in [5, 12, 8, 25]: stack.append(x); stack.pop(); stack.append(100); stack.pop(); print(stack[-1]). Giá trị hiển thị ở đỉnh ngăn xếp là:', opts: ['5', '12', '8', '100'], ans: 2, exp: 'Đẩy 5, 12, 8, 25 vào stack -> stack=[5, 12, 8, 25]. pop() lấy ra 25 -> stack=[5, 12, 8]. append(100) -> stack=[5, 12, 8, 100]. pop() lấy ra 100 -> stack=[5, 12, 8]. Đỉnh ngăn xếp stack[-1] là 8.' },
    { id: 'cs1_mcq_13', q: 'Cho danh sách A = [29, 10, 14, 37, 13]. Sau lượt duyệt đầu tiên (i = 0) của thuật toán Sắp xếp chọn (Selection Sort), trạng thái của danh sách A là:', opts: ['[10, 29, 14, 37, 13]', '[10, 14, 29, 37, 13]', '[10, 13, 14, 29, 37]', '[29, 10, 14, 13, 37]'], ans: 0, exp: 'Ở i=0, phần tử nhỏ nhất từ chỉ số 0 đến 4 là 10 (tại chỉ số 1). Hoán đổi A[0] và A[1] -> danh sách trở thành [10, 29, 14, 37, 13].' },
    { id: 'cs1_mcq_14', q: 'Cho danh sách A = [12, 11, 13, 5, 6]. Sau khi hoàn thành bước chèn phần tử A[1] = 11 (bước i = 1) trong thuật toán Sắp xếp chèn, danh sách có dạng:', opts: ['[11, 12, 13, 5, 6]', '[5, 6, 11, 12, 13]', '[12, 11, 13, 5, 6]', '[11, 13, 12, 5, 6]'], ans: 0, exp: 'Khóa key = 11 so sánh với 12, 12 dịch sang phải, 11 được chèn vào vị trí đầu tiên. Danh sách trở thành [11, 12, 13, 5, 6].' },
    { id: 'cs1_mcq_15', q: 'Cho danh sách A = [5, 1, 4, 2, 8]. Sau vòng lặp ngoài đầu tiên (i = 0) của thuật toán Sắp xếp nổi bọt tăng dần, trạng thái danh sách là:', opts: ['[1, 4, 2, 5, 8]', '[1, 2, 4, 5, 8]', '[5, 1, 2, 4, 8]', '[1, 5, 4, 2, 8]'], ans: 0, exp: "Các phép đổi chỗ lần lượt: (5,1)->[1,5,4,2,8]; (5,4)->[1,4,5,2,8]; (5,2)->[1,4,2,5,8]; (5,8) không đổi. Kết thúc vòng 1 phần tử lớn nhất 8 'nổi' về cuối dãy: [1, 4, 2, 5, 8]." },
    { id: 'cs1_mcq_16', q: 'Xét hàm đệ quy sau: def rec_bs(a, left, right, x): if left > right: return -1; mid = (left + right) // 2; if a[mid] == x: return mid; if a[mid] > x: return rec_bs(a, left, mid - 1, x); return rec_bs(a, mid + 1, right, x). Đoạn mã trên minh họa cho thuật toán nào dưới dạng đệ quy?', opts: ['Thuật toán tìm kiếm tuần tự', 'Thuật toán tìm kiếm nhị phân theo kĩ thuật chia để trị', 'Thuật toán chia mảng để sắp xếp', 'Thuật toán duyệt toàn bộ cây nhị phân'], ans: 1, exp: 'Đây là thuật toán Tìm kiếm nhị phân được viết bằng đệ quy, chia đôi bài toán kích thước n thành bài toán con kích thước n/2.' },
    { id: 'cs1_mcq_17', q: "Kỹ thuật 'Chia để trị' (Divide and Conquer) trong thiết kế thuật toán bao gồm 3 bước chuẩn theo thứ tự là:", opts: ['Chia (Divide) -> Trị (Conquer) -> Kết hợp (Combine)', 'Trị (Conquer) -> Chia (Divide) -> Kết hợp (Combine)', 'Tìm kiếm -> Sắp xếp -> Hoàn tất', 'Phân tích -> Viết mã -> Kiểm thử'], ans: 0, exp: '3 bước cơ bản của Chia để trị: (1) Chia bài toán lớn thành các bài toán con cùng dạng; (2) Trị bài toán con (giải đệ quy); (3) Kết hợp các kết quả bài toán con để được lời giải bài toán ban đầu.' },
    { id: 'cs1_mcq_18', q: 'Trong thuật toán Sắp xếp nhanh (QuickSort), trường hợp xấu nhất có độ phức tạp thời gian O(n^2) xảy ra khi nào?', opts: ['Mảng ban đầu hoàn toàn ngẫu nhiên và pivot luôn nằm ở chính giữa mảng', 'Phần tử chốt (pivot) luôn được chọn là phần tử nhỏ nhất hoặc lớn nhất trong mảng đã có thứ tự', 'Tất cả các phần tử trong mảng đều mang giá trị bằng 0', 'Kích thước mảng n là một số nguyên tố lẻ'], ans: 1, exp: 'Khi mảng đã có thứ tự và chốt luôn rơi vào phần tử nhỏ nhất hoặc lớn nhất, mảng bị phân hoạch lệch hoàn toàn (1 bên 0 phần tử, 1 bên n-1 phần tử), khiến chiều sâu đệ quy là n và độ phức tạp tăng lên O(n^2).' },
    { id: 'cs1_mcq_19', q: 'Cấu trúc dữ liệu Ngăn xếp (Stack) hoạt động theo nguyên tắc nào sau đây?', opts: ['FIFO (First In First Out - Vào trước ra trước)', 'LIFO (Last In First Out - Vào sau ra trước)', 'LILO (Last In Last Out - Vào sau ra sau)', 'Ngẫu nhiên không theo thứ tự'], ans: 1, exp: 'Ngăn xếp (Stack) hoạt động theo nguyên tắc LIFO (Last In First Out), phần tử nạp vào sau cùng sẽ được lấy ra đầu tiên qua đỉnh ngăn xếp.' },
    { id: 'cs1_mcq_20', q: 'Điều kiện tiên quyết bắt buộc của cấu trúc mảng để có thể áp dụng thuật toán Tìm kiếm nhị phân (Binary Search) là gì?', opts: ['Các phần tử trong mảng phải là số nguyên dương', 'Dãy số hoặc danh sách các phần tử phải được sắp xếp theo thứ tự (tăng dần hoặc giảm dần)', 'Độ dài của mảng phải là một lũy thừa của 2', 'Mảng không được chứa bất kì phần tử nào trùng lặp nhau'], ans: 1, exp: 'Tìm kiếm nhị phân dựa vào việc so sánh khóa tìm kiếm với phần tử giữa để loại bỏ một nửa không gian tìm kiếm, do đó mảng bắt buộc phải được sắp xếp trước.' }
  ],
  tf: [
    { id: 'cs1_tf_1', ctx: '(Trích Đề thi tốt nghiệp THPT chính thức năm 2025 — Mã đề 0501, 0502) Cho hàm sau đây được viết bằng ngôn ngữ lập trình Python và C++:', code: [
      { lang: 'Python', lines: [
        'def F(A, n):',
        '    for i in range(1, n):',
        '        x = A[i]',
        '        j = i - 1',
        '        while j >= 0 and A[j] > x:',
        '            A[j + 1] = A[j]',
        '            j = j - 1',
        '        A[j + 1] = x',
        '    return (A[n // 2] + A[n - 1]) / 2'
      ] },
      { lang: 'C++', lines: [
        'float F(int A[], int n) {',
        '    for (int i = 1; i < n; i++) {',
        '        int x = A[i];',
        '        int j = i - 1;',
        '        while (j >= 0 && A[j] > x) {',
        '            A[j + 1] = A[j];',
        '            j = j - 1;',
        '        }',
        '        A[j + 1] = x;',
        '    }',
        '    return (A[n / 2] + A[n - 1]) / 2.0;',
        '}'
      ] }
    ], ctxAfter: 'Sau khi chọn một trong hai ngôn ngữ Python hoặc C++ để tìm hiểu hàm trên, một số bạn học sinh đã nêu các ý kiến sau:', items: [
      { s: 'Mảng A biểu diễn cấu trúc dữ liệu ngăn xếp (Stack).', ans: false, exp: 'Sai. Mảng A trong đoạn mã được sử dụng để lưu trữ dãy phần tử dữ liệu cần sắp xếp và hỗ trợ truy cập ngẫu nhiên qua chỉ số A[i], A[j]. Đây không phải là cấu trúc dữ liệu ngăn xếp (Stack hoạt động theo cơ chế LIFO với các thao tác push/pop).' },
      { s: 'Nếu dữ liệu đầu vào là mảng A gồm n phần tử đã được sắp xếp theo chiều không giảm thì các câu lệnh tại Dòng 6 và Dòng 7 được thực hiện n lần.', ans: false, exp: 'Sai. Nếu mảng A ban đầu đã sắp xếp tăng dần (không giảm) thì với mọi i, giá trị x = A[i] luôn lớn hơn hoặc bằng A[j] = A[i-1]. Do đó, điều kiện lặp A[j] > x ngay lập tức nhận giá trị False; vòng lặp while không bao giờ được thực hiện lần nào (0 lần lặp), chứ không phải thực hiện n lần.' },
      { s: 'Nếu dữ liệu đầu vào là n = 6 và mảng A là (6, 4, 2, 1, 3, 5) thì sau khi câu lệnh for tại Dòng 2 thực hiện lần lặp thứ 2, giá trị của mảng A là (2, 4, 6, 1, 3, 5).', ans: true, exp: 'Đúng. Hàm F cài đặt thuật toán Sắp xếp chèn (Insertion Sort). Ban đầu mảng là (6, 4, 2, 1, 3, 5). Lần lặp thứ nhất (i = 1, x = 4): chèn 4 vào trước 6 -> mảng thành (4, 6, 2, 1, 3, 5). Lần lặp thứ hai (i = 2, x = 2): chèn 2 vào đầu đoạn đã sắp -> mảng trở thành (2, 4, 6, 1, 3, 5).' },
      { s: 'Nếu dữ liệu đầu vào là n = 7 và mảng A là (8, 6, 4, 2, 3, 5, 7) thì hàm trả về giá trị 6.5.', ans: true, exp: 'Đúng. Sau khi sắp xếp chèn hoàn tất, mảng A trở thành (2, 3, 4, 5, 6, 7, 8). Với n = 7: n // 2 = 3, A[3] = 5; phần tử cuối A[n - 1] = A[6] = 8. Giá trị trả về là (5 + 8) / 2 = 6.5.' }
    ] },
    { id: 'cs1_tf_2', ctx: '(Trích Đề thi thử tốt nghiệp THPT năm 2026 — Sở GD&ĐT Cà Mau lần 1) Nhóm học sinh đang tìm hiểu về các thuật toán cơ bản trên dãy số. Cô giáo cung cấp đoạn mã Python và C++ thực hiện tìm kiếm vị trí của giá trị x trong dãy A gồm n phần tử và yêu cầu nhóm phân tích:', code: [
      { lang: 'Python', lines: [
        'def search(A, n, x):',
        '    for i in range(n):',
        '        if A[i] == x:',
        '            return i',
        '    return -1'
      ] },
      { lang: 'C++', lines: [
        'int search(int A[], int n, int x) {',
        '    for (int i = 0; i < n; i++) {',
        '        if (A[i] == x)',
        '            return i;',
        '    }',
        '    return -1;',
        '}'
      ] }
    ], ctxAfter: 'Sau khi nghiên cứu, các bạn học sinh đưa ra các nhận xét sau:', items: [
      { s: 'Ở vòng lặp tại dòng lệnh for, biến chỉ số i sẽ nhận giá trị lần lượt chạy từ 0 đến n.', ans: false, exp: 'Sai. Trong Python, cú pháp range(n) sinh dãy số từ 0 đến n - 1 (không bao gồm n). Trong C++, điều kiện i < n cũng chỉ cho phép i nhận giá trị đến n - 1. Do đó nhận định chỉ số i chạy đến n là Sai.' },
      { s: 'Thuật toán được mô tả trong đoạn mã trên là thuật toán tìm kiếm tuần tự (Sequential Search).', ans: true, exp: 'Đúng. Thuật toán duyệt lần lượt từng phần tử A[0], A[1], ..., A[n-1] theo thứ tự tuyến tính từ đầu đến cuối dãy để so sánh với giá trị cần tìm x. Đây chính là thuật toán tìm kiếm tuần tự.' },
      { s: 'Với đầu vào dãy A = [5, 3, 8, 2] và x = 8, hàm sẽ thực hiện phép so sánh tại câu lệnh if đúng ba lần và trả về kết quả là 2.', ans: true, exp: 'Đúng. Lần 1: i = 0, A[0] = 5 == 8 (False). Lần 2: i = 1, A[1] = 3 == 8 (False). Lần 3: i = 2, A[2] = 8 == 8 (True) -> hàm lập tức return chỉ số 2. Vậy hàm thực hiện đúng 3 phép so sánh và trả về kết quả là 2.' },
      { s: 'Trong trường hợp giá trị x xuất hiện nhiều lần trong dãy A, hàm sẽ luôn trả về chỉ số của vị trí cuối cùng tìm thấy x.', ans: false, exp: 'Sai. Ngay khi tìm thấy phần tử A[i] == x đầu tiên, câu lệnh return i lập tức kết thúc hàm và trả về chỉ số đó. Do đó hàm luôn trả về vị trí xuất hiện đầu tiên của x trong dãy, không phải vị trí cuối cùng.' }
    ] },
    { id: 'cs1_tf_3', ctx: '(Trích Đề thi thử tốt nghiệp THPT năm 2026 — Sở GD&ĐT Gia Lai) Cho hàm sau đây được viết bằng ngôn ngữ lập trình Python và C++, trong đó mảng A gồm n phần tử đã được sắp xếp theo thứ tự tăng dần (không giảm):', code: [
      { lang: 'Python', lines: [
        'def binary_search(A, n, x):',
        '    left = 0',
        '    right = n - 1',
        '    while left <= right:',
        '        mid = (left + right) // 2',
        '        if A[mid] == x:',
        '            return mid + 1',
        '        elif A[mid] < x:',
        '            left = mid + 1',
        '        else:',
        '            right = mid - 1',
        '    return -1'
      ] },
      { lang: 'C++', lines: [
        'int binary_search(int A[], int n, int x) {',
        '    int left = 0, right = n - 1;',
        '    while (left <= right) {',
        '        int mid = (left + right) / 2;',
        '        if (A[mid] == x)',
        '            return mid + 1;',
        '        else if (A[mid] < x)',
        '            left = mid + 1;',
        '        else',
        '            right = mid - 1;',
        '    }',
        '    return -1;',
        '}'
      ] }
    ], ctxAfter: 'Sau khi chọn một trong hai ngôn ngữ Python hoặc C++ để tìm hiểu hàm trên, một số học sinh đưa ra các nhận định sau:', items: [
      { s: 'Thuật toán trên chỉ hoạt động đúng khi mảng A được sắp xếp theo thứ tự không giảm.', ans: true, exp: 'Đúng. Thuật toán Tìm kiếm nhị phân (Binary Search) dựa trên nguyên lý so sánh x với phần tử ở giữa A[mid] để loại bỏ một nửa số phần tử ở mỗi bước. Do đó, mảng A bắt buộc phải được sắp xếp trước thì thuật toán mới đảm bảo tính đúng đắn.' },
      { s: 'Với mảng A gồm n phần tử, trong trường hợp x tồn tại trong mảng, số lần lặp của vòng lặp while không vượt quá ⌈log₂n⌉ + 1.', ans: true, exp: 'Đúng. Ở mỗi bước lặp của tìm kiếm nhị phân, phạm vi tìm kiếm giảm đi một nửa (từ n xuống n/2, n/4,...). Do đó độ phức tạp thời gian là O(log₂n) và số lần lặp tối đa không vượt quá ⌈log₂n⌉ + 1.' },
      { s: 'Nếu giá trị x không tồn tại trong mảng A thì vòng lặp while luôn thực hiện đúng n lần.', ans: false, exp: 'Sai. Trong trường hợp xấu nhất (khi x không tồn tại trong mảng), vòng lặp while cũng chỉ lặp tối đa khoảng log₂n bước cho đến khi left > right thì dừng lại. Vòng lặp không bao giờ lặp n lần (n lần là đặc trưng của tìm kiếm tuần tự).' },
      { s: 'Nếu n = 7 và mảng A là (1, 3, 5, 7, 9, 11, 13), x = 7 thì hàm trả về giá trị 4.', ans: true, exp: 'Đúng. Mảng có 7 phần tử: left = 0, right = 6. Bước 1: mid = (0 + 6) // 2 = 3, A[3] = 7. So sánh A[3] == x (7 == 7) là Đúng -> hàm return mid + 1 = 3 + 1 = 4. Vậy hàm trả về giá trị 4.' }
    ] },
    { id: 'cs1_tf_4', ctx: '(Trích Đề thi thử tốt nghiệp THPT năm 2026 — Sở GD&ĐT Đà Nẵng lần 1) Cho hàm sau đây được viết bằng ngôn ngữ lập trình Python và C++:', code: [
      { lang: 'Python', lines: [
        'def S(A):',
        '    n = len(A)',
        '    for i in range(n - 1):',
        '        m = i',
        '        for j in range(i + 1, n):',
        '            if not (A[m] >= A[j]):',
        '                m = j',
        '        if m != i:',
        '            A[i], A[m] = A[m], A[i]',
        '    return A[0] + A[n - 2]'
      ] },
      { lang: 'C++', lines: [
        'float S(int A[], int n) {',
        '    for (int i = 0; i < n - 1; i++) {',
        '        int m = i;',
        '        for (int j = i + 1; j < n; j++) {',
        '            if (!(A[m] >= A[j])) {',
        '                m = j;',
        '            }',
        '        }',
        '        if (m != i) {',
        '            int t = A[i]; A[i] = A[m]; A[m] = t;',
        '        }',
        '    }',
        '    return (A[0] + A[n - 2]);',
        '}'
      ] }
    ], ctxAfter: 'Sau khi chọn một trong hai ngôn ngữ lập trình Python hoặc C++ để tìm hiểu hàm trên, một số bạn học sinh đã nêu các ý kiến sau:', items: [
      { s: 'Đoạn mã được mô tả bằng hàm S trên là thuật toán sắp xếp nổi bọt.', ans: false, exp: 'Sai. Hàm S sử dụng vòng lặp trong để tìm vị trí m của phần tử lớn nhất trong đoạn chưa sắp xếp A[i..n-1], sau đó đổi chỗ phần tử lớn nhất đó với A[i]. Đây là thuật toán Sắp xếp chọn (Selection Sort) theo thứ tự giảm dần, không phải Sắp xếp nổi bọt.' },
      { s: 'Thuật toán trên luôn thực hiện đầy đủ số lần lặp của các vòng for ngay cả khi danh sách ban đầu đã được sắp xếp.', ans: true, exp: 'Đúng. Cả hai vòng lặp for đều có số bước lặp cố định độc lập với nội dung dữ liệu (i chạy từ 0 đến n-2, j chạy từ i+1 đến n-1). Chương trình không có cờ hiệu kiểm tra hay lệnh ngắt break dừng sớm, nên dù mảng đã được sắp xếp thì các vòng lặp vẫn duyệt đầy đủ n(n-1)/2 lần so sánh.' },
      { s: 'Thuật toán trên sử dụng phương pháp tìm kiếm tuần tự để xác định vị trí của phần tử A[m] trong mỗi lần lặp.', ans: true, exp: 'Đúng. Trong vòng for thứ hai, chỉ số j duyệt tuần tự qua từng phần tử từ i + 1 đến n - 1 để so sánh và cập nhật vị trí của phần tử lớn nhất m. Đây chính là thao tác tìm kiếm tuần tự phần tử lớn nhất trong đoạn con chưa sắp xếp.' },
      { s: 'Nếu dữ liệu đầu vào là n = 10 và mảng A là (8, 4, 5, 2, 7, 9, 10, 14, 15, 12) thì hàm trả về giá trị 16.', ans: false, exp: 'Sai. Thuật toán sắp xếp mảng 10 phần tử theo thứ tự giảm dần, mảng trở thành (15, 14, 12, 10, 9, 8, 7, 5, 4, 2). Hàm trả về A[0] + A[n - 2] = A[0] + A[8] = 15 + 4 = 19, không phải 16.' }
    ] }
  ]
};
