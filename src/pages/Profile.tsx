import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{user?.user_metadata?.full_name || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
