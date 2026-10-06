import { buttonClass } from './buttonClass.js'

export function Button({ variante, tamano, className, type = 'button', ...props }) {
  return <button type={type} className={buttonClass(variante, className, tamano)} {...props} />
}
