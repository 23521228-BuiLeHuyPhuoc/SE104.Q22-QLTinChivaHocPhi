const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const curriculumService = require('../src/services/curriculumService');

async function runTests() {
  console.log('--- STARTING N2 TEST CASES ---');

  // Test N2-21 & N2-22: Tính nợ tín chỉ & điều kiện khóa luận
  console.log('\nTesting N2-21 & N2-22: Curriculum Debt & Thesis Eligibility');
  try {
    // Tìm một sinh viên để test (lấy sinh viên đầu tiên)
    const student = await prisma.SINHVIEN.findFirst({
      where: { DaXoa: false }
    });

    if (student) {
      console.log(`Testing with student: ${student.MaSv}`);
      
      // Giả lập tính toán nợ tín chỉ
      // Do không thể can thiệp dữ liệu thật ở đây một cách an toàn mà không làm hỏng DB,
      // ta sẽ gọi service để kiểm tra logic tính toán hiện tại có crash không.
      const debtResult = await curriculumService.calculateCurriculumDebt(student.MaSv, 'HK1');
      console.log('Debt calculation result for HK1:');
      console.log(`- Total Debt Credits: ${debtResult?.debtCredits}`);
      console.log(`- Eligible for thesis (<= 8 credits debt)? ${debtResult?.debtCredits <= 8}`);
      
      const eligibility = await curriculumService.getThesisEligibility(student.MaSv, 'HK1');
      console.log('Thesis Eligibility Service Result:');
      console.log(`- Eligible: ${eligibility?.eligible}`);
      console.log(`- Owed Credits: ${eligibility?.owedCredits}`);
      
      console.log('✅ N2-21 & N2-22 logic functions ran successfully.');
    } else {
      console.log('No student found to test.');
    }
  } catch (error) {
    console.error('❌ Error in N2-21 & N2-22 tests:', error);
  }

  console.log('\n--- ALL TESTS COMPLETED ---');
  await prisma.$disconnect();
}

runTests();
