
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Stepper } from '@/components/shared/stepper';
import { mockEvents } from '@/lib/mock/data';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const registrationSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  bibNumber: z.string().optional(),
  tShirtSize: z.string().min(1, "Please select a t-shirt size"),
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Valid phone number is required"),
  agreeTerms: z.boolean().refine((val) => val === true, "You must agree to the terms"),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export function RegisterEventPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const event = mockEvents.find((e) => e.id === id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      agreeTerms: false,
    },
  });

  const onSubmit = (data: RegistrationFormValues) => {
    console.log('Registration Data:', data);
    // In a real app, send data to API
    navigate('/account/registrations');
  };

  if (!event) {
    return (
      <DashboardShell role="attendee">        <Heading className="mb-6">{t('registration.eventNotFound')}</Heading>
        <Button asChild>
          <Link to="/events">Back to Events</Link>
        </Button>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="attendee">      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4 -ml-4" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t('registration.back')}
        </Button>

        <Heading className="mb-2">{t('registration.title', { eventName: event.title })}</Heading>
        <p className="text-muted-foreground mb-8">{t('registration.subtitle')}</p>

        <Stepper currentStep={step} steps={[
          { label: t('registration.step1'), description: t('registration.step1Desc') },
          { label: t('registration.step2'), description: t('registration.step2Desc') },
          { label: t('registration.step3'), description: t('registration.step3Desc') },
        ]} />

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('registration.step1.title')}</CardTitle>
                <CardDescription>{t('registration.step1.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('registration.categoryLabel')}</Label>
                  <Select onValueChange={(val) => setValue('category', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('registration.categoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {event.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} - {cat.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>{t('registration.tShirtLabel')}</Label>
                  <Select onValueChange={(val) => setValue('tShirtSize', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('registration.tShirtPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tShirtSize && <p className="text-xs text-red-500">{errors.tShirtSize.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="button" onClick={() => setStep(2)}>
                  {t('registration.next')} <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('registration.step2.title')}</CardTitle>
                <CardDescription>{t('registration.step2.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('registration.emergencyContactNameLabel')}</Label>
                  <Input {...register('emergencyContactName')} placeholder="Full Name" />
                  {errors.emergencyContactName && <p className="text-xs text-red-500">{errors.emergencyContactName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('registration.emergencyContactPhoneLabel')}</Label>
                  <Input {...register('emergencyContactPhone')} placeholder="0812..." />
                  {errors.emergencyContactPhone && <p className="text-xs text-red-500">{errors.emergencyContactPhone.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> {t('registration.back')}
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  {t('registration.next')} <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('registration.step3.title')}</CardTitle>
                <CardDescription>{t('registration.step3.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('registration.summary.category')}</span>
                    <span className="font-medium">{watch('category')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('registration.summary.tShirt')}</span>
                    <span className="font-medium">{watch('tShirtSize')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('registration.summary.total')}</span>
                    <span>{event.categories.find(c => c.id === (watch('category') as string))?.price || '0'}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" onCheckedChange={(val) => setValue('agreeTerms', !!val)} />
                  <Label htmlFor="terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t('registration.termsAgreement')}
                  </Label>
                </div>
                {errors.agreeTerms && <p className="text-xs text-red-500">{errors.agreeTerms.message}</p>}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> {t('registration.back')}
                </Button>
                <Button type="submit">
                  {t('registration.confirm')} <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </div>
    </DashboardShell>
  );
}
