import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-left">
          <span className="footer-brand">QLSV - Hệ thống Quản lý Sinh viên</span>
          <span className="footer-copyright">
            © {currentYear} Đại học Công nghệ Thông tin - ĐHQG TP.HCM
          </span>
        </div>
        <div className="footer-right">
          <a href="#" className="footer-link">Hướng dẫn sử dụng</a>
          <span className="footer-divider">|</span>
          <a href="#" className="footer-link">Liên hệ hỗ trợ</a>
          <span className="footer-divider">|</span>
          <span className="footer-version">Phiên bản 1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
