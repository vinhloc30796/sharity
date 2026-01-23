# Tailwind CSS + shadcn/ui Patterns

Knowledge base for styling with Tailwind CSS and shadcn/ui components.

## Setup

### shadcn/ui Installation

```bash
npx shadcn@latest init
```

### Add Components

```bash
npx shadcn@latest add button card input label form dialog
```

## Utility Classes Reference

### Layout

```html
<!-- Flexbox -->
<div class="flex items-center justify-between gap-4">
<div class="flex flex-col gap-2">

<!-- Grid -->
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

<!-- Container -->
<div class="container mx-auto px-4">

<!-- Position -->
<div class="relative">
  <div class="absolute top-0 right-0">
```

### Spacing

```html
<!-- Padding -->
<div class="p-4">        <!-- 16px all sides -->
<div class="px-4 py-2">  <!-- 16px horizontal, 8px vertical -->
<div class="pt-8">       <!-- 32px top -->

<!-- Margin -->
<div class="m-4">        <!-- 16px all sides -->
<div class="mx-auto">    <!-- center horizontally -->
<div class="mt-8 mb-4">  <!-- 32px top, 16px bottom -->

<!-- Gap (in flex/grid) -->
<div class="flex gap-4">
<div class="grid gap-6">
```

### Typography

```html
<h1 class="text-4xl font-bold tracking-tight">
<h2 class="text-2xl font-semibold">
<p class="text-gray-600 text-sm leading-relaxed">
<span class="text-muted-foreground">

<!-- Truncate -->
<p class="truncate">Long text...</p>
<p class="line-clamp-2">Multi-line truncate...</p>
```

### Colors

```html
<!-- Text -->
<p class="text-primary">Primary color</p>
<p class="text-muted-foreground">Muted text</p>
<p class="text-destructive">Error text</p>

<!-- Background -->
<div class="bg-background">Default bg</div>
<div class="bg-muted">Muted bg</div>
<div class="bg-primary text-primary-foreground">Primary bg</div>

<!-- Border -->
<div class="border border-border rounded-lg">
<div class="border-t">
```

### Responsive Design

```html
<!-- Mobile first -->
<div class="flex flex-col md:flex-row">
<div class="w-full md:w-1/2 lg:w-1/3">
<div class="hidden md:block">
<div class="block md:hidden">
```

## shadcn/ui Components

### Button

```tsx
import { Button } from '@/components/ui/button'

// Variants
<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconPlus /></Button>

// States
<Button disabled>Disabled</Button>
<Button className="w-full">Full width</Button>
```

### Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Form with React Hook Form

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  email: z.string().email('Invalid email address')
})

function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      email: ''
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter title" {...field} />
              </FormControl>
              <FormDescription>This is the item title.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### Dialog (Modal)

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

<Select value={category} onValueChange={setCategory}>
  <SelectTrigger>
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="kitchen">Kitchen</SelectItem>
    <SelectItem value="furniture">Furniture</SelectItem>
    <SelectItem value="electronics">Electronics</SelectItem>
  </SelectContent>
</Select>
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="list" className="w-full">
  <TabsList>
    <TabsTrigger value="list">List View</TabsTrigger>
    <TabsTrigger value="map">Map View</TabsTrigger>
  </TabsList>
  <TabsContent value="list">
    <ItemsList items={items} />
  </TabsContent>
  <TabsContent value="map">
    <ItemsMap items={items} />
  </TabsContent>
</Tabs>
```

## Common Patterns

### Item Card

```tsx
<Card className="overflow-hidden hover:shadow-lg transition-shadow">
  <div className="aspect-video relative">
    <Image
      src={item.images[0]}
      alt={item.title}
      fill
      className="object-cover"
    />
    <Badge className="absolute top-2 right-2">{item.category}</Badge>
  </div>
  <CardHeader className="p-4">
    <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
    <CardDescription className="line-clamp-2">
      {item.description}
    </CardDescription>
  </CardHeader>
  <CardFooter className="p-4 pt-0 flex justify-between items-center">
    <span className="text-sm text-muted-foreground">
      {item.location.address}
    </span>
    <Button size="sm">View</Button>
  </CardFooter>
</Card>
```

### Loading Skeleton

```tsx
import { Skeleton } from '@/components/ui/skeleton'

function ItemCardSkeleton() {
  return (
    <Card>
      <Skeleton className="aspect-video" />
      <CardHeader className="p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-9 w-20" />
      </CardFooter>
    </Card>
  )
}
```

### Empty State

```tsx
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconPackage className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No items found</h3>
      <p className="text-muted-foreground mt-1">{message}</p>
      <Button className="mt-4">Add Item</Button>
    </div>
  )
}
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map((item) => (
    <ItemCard key={item.id} item={item} />
  ))}
</div>
```

## Dark Mode

### Theme Provider

```tsx
// In layout.tsx
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

### Theme Toggle

```tsx
'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```
