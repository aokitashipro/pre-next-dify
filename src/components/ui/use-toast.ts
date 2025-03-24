// 参考: https://ui.shadcn.com/docs/components/toast
import { ReactNode } from "react"

import {
  type ToastActionElement,
  type ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = {
  id: string
  title?: ReactNode
  description?: ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive"
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionState = {
  toasts: ToasterToast[]
}

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast>; id: string }
  | { type: "DISMISS_TOAST"; id: string }
  | { type: "REMOVE_TOAST"; id: string }

let listeners: ((state: ActionState) => void)[] = []
let memoryState: ActionState = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function reducer(state: ActionState, action: Action): ActionState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { id } = action

      // First dismiss toast
      if (id) {
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === id
              ? {
                  ...t,
                  open: false,
                }
              : t
          ),
        }
      }

      // Dismiss all toasts
      return {
        ...state,
        toasts: state.toasts.map((t) => ({
          ...t,
          open: false,
        })),
      }
    }
    case "REMOVE_TOAST":
      if (action.id === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    default:
      return state
  }
}

function useToast() {
  const subscribe = (onStateChange: (state: ActionState) => void) => {
    listeners.push(onStateChange)
    return () => {
      listeners = listeners.filter((listener) => listener !== onStateChange)
    }
  }

  const toast = ({
    title,
    description,
    variant,
    action,
    ...props
  }: ToastProps & {
    title?: ReactNode
    description?: ReactNode
    action?: ToastActionElement
    variant?: "default" | "destructive"
  }) => {
    const id = genId()

    const update = (props: Partial<ToasterToast>) =>
      dispatch({
        type: "UPDATE_TOAST",
        id,
        toast: props,
      })

    const dismiss = () => dispatch({ type: "DISMISS_TOAST", id })

    dispatch({
      type: "ADD_TOAST",
      toast: {
        id,
        title,
        description,
        variant,
        action,
        open: true,
        ...props,
      },
    })

    return {
      id,
      dismiss,
      update,
    }
  }

  return {
    toast,
    dismiss: (id?: string) => dispatch({ type: "DISMISS_TOAST", id: id ?? "" }),
    remove: (id?: string) => dispatch({ type: "REMOVE_TOAST", id: id ?? "" }),
    subscribe,
    toasts: memoryState.toasts,
  }
}

export { useToast, type ToasterToast } 