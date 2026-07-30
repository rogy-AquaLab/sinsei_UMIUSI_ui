import {
  cloneElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react'

const composeProviders = (...providers: ReactElement<PropsWithChildren>[]) => {
  return ({ children }: PropsWithChildren) =>
    providers.reduceRight<ReactNode>(
      (nestedChildren, provider) =>
        cloneElement(provider, undefined, nestedChildren),
      children,
    )
}

export default composeProviders
