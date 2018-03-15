/* global localStorage, sessionStorage */
import { observable, autorun, set, toJS } from 'mobx'
import merge from 'lodash.merge'
import cloneDeep from 'lodash.clonedeep'

function factory(storage) {
  return function storedObservable(key, defaultValue, debounce = 500) {
    let fromStorage = storage.getItem(key)

    const defaultClone = cloneDeep(defaultValue) // we don't want to modify the given object, because userscript might want to use the original object to reset the state back to default values some time later
    if (fromStorage) {
      merge(defaultClone, JSON.parse(fromStorage))
    }

    const obsVal = observable(defaultClone)
    let disposeAutorun
    const establishAutorun = () => {
      disposeAutorun = autorun(() => {
        storage.setItem(key, JSON.stringify(toJS(obsVal)))
      }, { debounce })
    }
    establishAutorun()

    const propagateChangesToMemory = e => {
      if (e.key === key) {
        disposeAutorun()
        const newValue = JSON.parse(e.newValue)
        set(obsVal, newValue)

        establishAutorun()
      }
    }
    window.addEventListener('storage', propagateChangesToMemory)

    obsVal.reset = () => {
      disposeAutorun && disposeAutorun()
      set(obsVal, defaultValue)
      establishAutorun()
    }
    obsVal.extend = obj => {
      disposeAutorun && disposeAutorun()
      set(obsVal, obj)
      establishAutorun()
    }
    obsVal.destroy = () => {
      disposeAutorun()
      storage.removeItem(key)
      window.removeEventListener('storage', propagateChangesToMemory)
    }
    return obsVal
  }
}

export const localStored = factory(localStorage)
export const sessionStored = factory(sessionStorage)
