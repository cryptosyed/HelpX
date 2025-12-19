export default function StatsCard({ title, value, icon, gradient = false, className = "" }) {
  return (
    <div className={`glass rounded-xl p-6 border border-slate-200/50 shadow-md ${gradient ? 'bg-gradient-primary text-white border-transparent' : ''} ${className}`}>
      {icon && (
        <div className={`text-3xl mb-3 ${gradient ? 'text-white/90' : 'text-primary-start'}`}>
          {icon}
        </div>
      )}
      <h3 className={`text-sm font-semibold mb-2 ${gradient ? 'text-white/90' : 'text-slate-600'}`}>
        {title}
      </h3>
      <div className={`text-3xl font-bold ${gradient ? 'text-white' : 'text-gradient'}`}>
        {value}
      </div>
    </div>
  );
}

