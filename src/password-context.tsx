import { createContext } from 'preact';
import { useState } from 'preact/hooks';

type PasswordString = string;

interface IPasswordContext {
    password: PasswordString;
    setPassword: (value: ((prevState: PasswordString) => PasswordString) | PasswordString) => void;
}

export const PasswordContext = createContext<IPasswordContext>({
    password: '',
    setPassword: () => {
        throw new Error('PasswordContext.setPassword(): This should never happen');
    },
});

interface PasswordContextProviderProps {
    children: preact.ComponentChildren;
}

export function PasswordContextProvider(props: PasswordContextProviderProps) {
    const [password, setPassword] = useState<PasswordString>('');

    /*   const setPasswordOverload = (value: ((prevState: PasswordString) => PasswordString) | PasswordString) => {
    if (typeof value === 'function') {
      setPassword(value(password));
    } else {
      setPassword(value);
    }
  }; */

    return <PasswordContext.Provider value={{ password: password, setPassword: setPassword }}>{props.children}</PasswordContext.Provider>;
}
