import { buttonClass } from './buttonClass.js'

export function Button({ variante, className, ...props }) {
  return <button className={buttonClass(variante, className)} {...props} />
}
