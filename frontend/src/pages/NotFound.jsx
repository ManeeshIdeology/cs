import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Empty } from '../components/ui'

export default function NotFound() {
  return (
    <div className="card">
      <Empty icon={Compass} title="Page not found" action={<Link className="btn btn-primary" to="/">Go to home</Link>}>
        The page you are looking for does not exist.
      </Empty>
    </div>
  )
}
