export interface ProductoType {
    id: number;
    title: string;
    content: string;
    image: string | null;
    user_id: number;
    item_id: number;
    status_id: number;
    latitude: string;
    longitude: string;
    green_point_id: number;
    created_at: string;
    updated_at: string;
    user: {
      id: number;
      username: string;
      name: string;
      lastname: string;
      email: string;
      phone: string;
      address_id: number;
      role_id: number;
      latitude: string;
      longitude: string;
      gender_id: number | null;
      birthdate: string;
      image: string | null;
      is_active: boolean;
      banned_at: string | null;
      ban_reason: string | null;
      verified: boolean;
      email_verified_at: string | null;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    };
    item: {
      id: number;
      category_id: number;
      name: string;
      created_at: string;
      updated_at: string;
    };
  }
  
  export type RootStackParamList = {
    AuthLoading: undefined;
    Login:        undefined;
    Register:     undefined;
    Home:         undefined;   
    Chat: {
      initialMessage: string;
      producto: ProductoType;
    };
  };
  