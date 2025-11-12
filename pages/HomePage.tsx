import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, CalendarDays, BarChart3, TrendingUp, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-10">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center flex-wrap gap-y-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ورشاتك</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleLoginClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
            >
              دخول
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-6xl font-extrabold text-gray-800 mb-4 leading-tight">
            أدر ورشاتك بذكاء, وسيطر على مصاريفك بدقة
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            "ورشاتك" هو نظامك المتكامل لإدارة جميع جوانب مشاريع المقاولات. من متابعة العمال واليوميات إلى إصدار التقارير المالية الدقيقة, كل ما تحتاجه في منصة واحدة سهلة الاستخدام.
          </p>
          <div className="animated-text-container text-4xl" style={{color: '#2563EB'}}>
              <span style={{background: 'linear-gradient(90deg, transparent, #2563EB)'}}></span>
              <span style={{background: 'linear-gradient(180deg, transparent, #2563EB)'}}></span>
              <span style={{background: 'linear-gradient(270deg, transparent, #2563EB)'}}></span>
              <span style={{background: 'linear-gradient(360deg, transparent, #2563EB)'}}></span>
              ابدأ الآن
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-800">لماذا تختار "ورشاتك"؟</h3>
            <p className="text-gray-600 mt-2">نقدم لك الأدوات التي تحتاجها للنجاح والنمو.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Users className="w-12 h-12 text-blue-600" />}
              title="إدارة متكاملة للموظفين"
              description="سجل العمال والرؤساء, وحدد رواتبهم ونظام ساعات العمل الإضافية, وتابع كل تفاصيلهم بسهولة."
            />
            <FeatureCard
              icon={<CalendarDays className="w-12 h-12 text-blue-600" />}
              title="تسجيل يوميات دقيق"
              description="سجل الحضور والغياب, الساعات الإضافية, السلف والخصومات بشكل يومي, مع إمكانية التسجيل الجماعي لتوفير الوقت."
            />
            <FeatureCard
              icon={<BarChart3 className="w-12 h-12 text-blue-600" />}
              title="تقارير مالية شاملة"
              description="احصل على تقارير مفصلة وملخصة للعمال, الورش, والمصاريف لأي فترة زمنية, وقم بتصديرها وطباعتها بضغطة زر."
            />
            <FeatureCard
              icon={<TrendingUp className="w-12 h-12 text-blue-600" />}
              title="لوحة تحكم ذكية"
              description="تابع أداء مشاريعك من خلال رسوم بيانية تفاعلية وإحصائيات حية تساعدك على اتخاذ قرارات مستنيرة."
            />
             <FeatureCard
              icon={<Briefcase className="w-12 h-12 text-blue-600" />}
              title="إدارة حسابات متعددة"
              description="نظام مصمم لإدارة عدة حسابات مقاولين (كابلان) منفصلة, كل حساب ببياناته الخاصة, مما يمنحك مرونة فائقة."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-12 h-12 text-blue-600" />}
              title="أمان وسهولة في الاستخدام"
              description="بياناتك في أمان تام, مع واجهة استخدام بسيطة وعصرية مصممة لتكون رفيقك اليومي في إدارة أعمالك."
            />
          </div>
        </div>
      </section>
      
      {/* Image section */}
      <section className="bg-white py-10">
        <div className="container mx-auto px-6">
           <img 
             src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
             alt="Team working on a project"
             className="rounded-lg shadow-2xl mx-auto"
           />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold mb-4">هل أنت جاهز لتبسيط إدارة ورشاتك؟</h3>
          <p className="text-blue-200 text-lg mb-12 max-w-2xl mx-auto">انضم إلى المقاولين الناجحين الذين يعتمدون على "ورشاتك" لتحقيق الدقة والكفاءة في إدارة مشاريعهم.</p>
          <div className="animated-text-container text-4xl" style={{color: '#fff'}}>
              <span style={{background: 'linear-gradient(90deg, transparent, #fff)'}}></span>
              <span style={{background: 'linear-gradient(180deg, transparent, #fff)'}}></span>
              <span style={{background: 'linear-gradient(270deg, transparent, #fff)'}}></span>
              <span style={{background: 'linear-gradient(360deg, transparent, #fff)'}}></span>
              ابدأ تجربتك
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; {new Date().getFullYear()} ورشاتك. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow text-center">
    <div className="flex justify-center mb-4">
      {icon}
    </div>
    <h4 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h4>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default HomePage;