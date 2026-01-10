import 'boxicons/css/boxicons.min.css';
import Spline from '@splinetool/react-spline';

const Hero = () => { 
  return (
    <main className="flex lg:mt-20 flex-col lg:flex-row items-center justify-between mmin-h0[calc(90vh-6rem)]">
        
        {/* Left Content Area */}
        <div className="max-w-xl ml-[5%] z-10 mt-[90%] md:mt-[60%] lg:mt-0">

            {/* Introducing Container */}
            <div className='relative w-[95%] sm:w-46 h-10 bg-gradient-to-r from-[#656565] to-[#e99b63] shadow-[0_0_15px_rgba(255,255,255,0.4)] rounded-full'> 
                <div className='absolute inset-[3px] bg-black rounded-full flex items-center justify-center gap-1'><i class='bx bx-diamond'>Introducing</i></div>
            </div> 

            {/* Company Home Page Container */}  
            <h1 className='text-3xl  sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-wider my-8'>Career Compass<br/>Homepage</h1> 
            
            {/* Welcome to company home page! Container */}
            <p className='text-base sm:text-lg tracking-wider text-grab-400 max-w-[25rem] lg:max-w-[30rem]'>Welcome to Career Compass Website!</p> 

            {/* Introduction & Get Started aligned same row */}
            <div className='flex gap-4 mt-12'> 
                <a classname='border border-[#2a2a2a] py-2 sm:py-3 px-4 sm:px-5 rounded-full sm:text-lg text-sm font-semibold tracking-wider transition-all duration-300 hover:bg-[#1a1a1a]' href='/home'> Introduction <i class='bx bx-link-external'></i></a>{/* Introduction Button */}
                <a classname='border border-[#2a2a2a] py-2 sm:py-3 px-4 sm:px-5 rounded-full sm:text-lg text-sm font-semibold tracking-wider transition-all duration-300 hover:bg-[#1a1a1a]' href='/home'> Get Started <i class='bx bx-link-external'></i></a>{/* Get Started Button */}
            </div>

        </div>

        {/* Right Content Area: Robot's Spline Scene */}
        <Spline scene="https://prod.spline.design/xT2D5-PXRdX9r7gu/scene.splinecode" /> 

    </main>
  )
}

export default Hero;