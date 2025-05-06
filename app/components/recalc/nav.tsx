import { Mountain } from 'lucide-react';
import { Link } from 'react-router';

export default function Nav() {
  return (
    <header className="h-8 w-full bg-primary">
      <div className="flex h-full items-center justify-center">
        <Link to="/" className="flex items-center justify-center">
          <Mountain className="h-8 w-8 text-white" />
          <span className="text-white">ReCalc</span>
        </Link>
      </div>
    </header>
  );
}
