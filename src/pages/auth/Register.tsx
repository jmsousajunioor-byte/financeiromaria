import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const registerSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').trim(),
  email: z.string().email('Email inválido').trim(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-4">
      <div className="animate-fade-in">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Criar conta</CardTitle>
            <CardDescription className="text-base">
              Comece a gerenciar suas finanças hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="João Silva" 
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="seu@email.com" 
                          type="email" 
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="••••••••" 
                          type="password" 
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="••••••••" 
                          type="password" 
                          {...field}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-opacity" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/auth/login" className="font-medium text-primary hover:underline">
                Fazer login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
