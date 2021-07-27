import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
      return [];
  });

  const addProduct = async (productId: number) => {
    try {
     const updatedCart = [...cart]; // Criou um updatedCart que reaproveita tudo de cart para respeitar a regra da imutabilidade do React
      const productExists =  updatedCart.find(product => product.id === productId); //Depois verifica se o produto existe baseado no id recebido da api, faz isso comparando o parametro no find do novo objeto com o parâmetro recebido pela própria função

      const stock = await api.get(`/stock/${productId}`); // depois pega o estoque existente na api do db 
      const stockAmount = stock.data.amount; // formata essa verificação pegando apenas o amount a ser usado

      const currentAmount = productExists ? productExists.amount : 0; // faz uma verificação, se o produto existir no carrinho, será pego o ammount dele, caso não ele é 0
      const amount = currentAmount + 1; //Quantidade desejada

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque'); // Faz uma verificação, caso o estoque mostrado atual passe da quantidade existente no db um erro é disparado
        return;
      }
      if(productExists){
        productExists.amount = amount; // faz a verificação do estoque do produto no db e iguala ao atual no front
      }else{
        const product = await api.get(`/products/${productId}`);  
  
        const newProduct = { // seta um novo produto caso ele exista no db e coloca sua quantidade ao fim do objeto
          ...product.data,
              amount:1
        }
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    }
     catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);
      
      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      }else{
        throw Error(); 
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`);  
      const stockAmount = stock.data.amount; 

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque'); 
        return;
      }

      const updatedCart = [...cart];
      const productExists =  updatedCart.find(product => product.id === productId); 

      if(productExists){
         productExists.amount = amount;
         setCart(updatedCart);
         localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else{
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
