export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex justify-between items-start gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient m-0">{title}</h1>
        {subtitle && <p className="text-slate-600 mt-2 m-0">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

