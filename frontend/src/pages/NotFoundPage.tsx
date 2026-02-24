import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-gray-200">404</h1>
        <p className="text-xl font-bold text-gray-800 mt-4">Page non trouvée</p>
        <p className="text-gray-500 mt-2">La page que vous cherchez n'existe pas.</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-6" icon={<Home className="w-4 h-4" />}>
          Retour au dashboard
        </Button>
      </div>
    </div>
  )
}
